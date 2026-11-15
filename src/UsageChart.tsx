import {useState} from 'react';
import {VStack} from '@astryxdesign/core/Layout';
import {Card} from '@astryxdesign/core/Card';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Link} from '@astryxdesign/core/Link';
import {Collapsible} from '@astryxdesign/core/Collapsible';
import usageJson from './data/usage.json';
import {deckWikiUrl, ymd} from './regulation';

export interface Usage {
  fetched_at: string;
  from: string;
  to: string;
  total: number;
  source: {title: string; url: string; region: string};
  tournaments: {name: string; date: string; players: number; url: string}[];
  skipped: {name: string; date: string | null; players: number; sum: number}[];
  decks: {name: string; count: number}[];
}
export const usage = usageJson as Usage;

/** 円グラフに出すのは上位5つ＋その他（6区分まで） */
export const TOP = 5;

export interface Slice {
  name: string;
  count: number;
  share: number;
  other?: boolean;
}

export function slices(u: Usage): Slice[] {
  const top = u.decks.slice(0, TOP).map(d => ({...d, share: d.count / u.total}));
  const rest = u.decks.slice(TOP).reduce((s, d) => s + d.count, 0);
  return rest ? [...top, {name: 'その他', count: rest, share: rest / u.total, other: true}] : top;
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

function arc(cx: number, cy: number, r: number, R: number, a0: number, a1: number) {
  const p = (rad: number, a: number) => [cx + rad * Math.sin(a), cy - rad * Math.cos(a)];
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = p(R, a0);
  const [x1, y1] = p(R, a1);
  const [x2, y2] = p(r, a1);
  const [x3, y3] = p(r, a0);
  return `M${x0} ${y0} A${R} ${R} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${r} ${r} 0 ${large} 0 ${x3} ${y3} Z`;
}

function Donut({data, active, setActive}: {data: Slice[]; active: number | null; setActive: (i: number | null) => void}) {
  const size = 200;
  const c = size / 2;
  let a = 0;
  const hovered = active == null ? null : data[active];
  return (
    <svg
      className="usage-donut"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`デッキの使用率。${data.map(d => `${d.name} ${pct(d.share)}`).join('、')}`}>
      {data.map((d, i) => {
        const a0 = a;
        a += d.share * Math.PI * 2;
        const a1 = data.length === 1 ? a - 0.0001 : a;
        return (
          <path
            key={d.name}
            d={arc(c, c, 58, active === i ? 96 : 92, a0, a1)}
            className={`usage-seg ${d.other ? 'usage-other' : `usage-s${i + 1}`}`}
            onPointerEnter={() => setActive(i)}
            onPointerLeave={() => setActive(null)}>
            <title>{`${d.name}：${d.count}人（${pct(d.share)}）`}</title>
          </path>
        );
      })}
      <text x={c} y={c - 6} textAnchor="middle" className="usage-center-main">
        {hovered ? pct(hovered.share) : `${usage.total}人`}
      </text>
      <text x={c} y={c + 16} textAnchor="middle" className="usage-center-sub">
        {hovered ? hovered.name : `${usage.tournaments.length}大会`}
      </text>
    </svg>
  );
}

export default function UsageChart() {
  const [active, setActive] = useState<number | null>(null);
  const data = slices(usage);
  const max = usage.decks[0]?.count ?? 1;
  return (
    <Card>
      <VStack gap={4}>
        <VStack gap={1}>
          <Heading level={2}>デッキの使用率</Heading>
          <Text size="sm" color="secondary">
            {ymd(usage.from)}〜{ymd(usage.to)}の{usage.tournaments.length}大会・予選{usage.total}人
          </Text>
        </VStack>
        <div className="usage-main">
          <Donut data={data} active={active} setActive={setActive} />
          <ol className="usage-legend">
            {data.map((d, i) => (
              <li
                key={d.name}
                className={active === i ? 'is-active' : undefined}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}>
                <span className={`usage-swatch ${d.other ? 'usage-other' : `usage-s${i + 1}`}`} />
                <span className="usage-legend-name">
                  {d.other ? (
                    `その他（${usage.decks.length - TOP}デッキ）`
                  ) : (
                    <a href={deckWikiUrl({name: d.name, note: ''})} target="_blank" rel="noreferrer">
                      {d.name}
                    </a>
                  )}
                </span>
                <span className="usage-legend-num">{pct(d.share)}</span>
                <span className="usage-legend-count">{d.count}人</span>
              </li>
            ))}
          </ol>
        </div>

        <Collapsible defaultIsOpen={false} trigger={<Text weight="semibold">全{usage.decks.length}デッキの内訳</Text>}>
          <ol className="usage-bars">
            {usage.decks.map(d => (
              <li key={d.name}>
                <span className="usage-bar-name">{d.name}</span>
                <span className="usage-bar-track">
                  <span className="usage-bar-fill" style={{width: `${(d.count / max) * 100}%`}} />
                </span>
                <span className="usage-bar-num">
                  {d.count}人・{pct(d.count / usage.total)}
                </span>
              </li>
            ))}
          </ol>
        </Collapsible>

        <Text size="sm" color="secondary">
          集計：
          {usage.tournaments.map((t, i) => (
            <span key={t.name + t.date}>
              {i > 0 && '、'}
              {ymd(t.date).slice(5)} {t.name}（{t.players}人）
            </span>
          ))}
          の予選デッキ分布の合計。出典：
          <Link href={usage.source.url} isExternalLink>
            {usage.source.title}
          </Link>
          （{usage.source.region}。全国の数字ではありません。{ymd(usage.fetched_at)} 取得、毎週自動更新）
          {usage.skipped.length > 0 && `。人数と分布の合計が合わなかった${usage.skipped.length}大会は除外`}
        </Text>
      </VStack>
    </Card>
  );
}
