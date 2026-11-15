import {useState} from 'react';
import {VStack} from '@astryxdesign/core/Layout';
import {Card} from '@astryxdesign/core/Card';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Link} from '@astryxdesign/core/Link';
import {Collapsible} from '@astryxdesign/core/Collapsible';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import usageJson from './data/usage.json';
import {deckWikiUrl, ymd} from './regulation';

/** 1つの情報源（全国・関東・関西）の集計 */
export interface UsageSource {
  id: string;
  label: string;
  /** 何を数えたか（入賞回数、優勝回数、予選の使用者数） */
  metric: string;
  unit: string;
  from: string;
  to: string;
  total: number;
  sample: string;
  note: string;
  source: {title: string; url: string};
  events: {name: string; date?: string; players?: number; url: string}[];
  skipped: number;
  decks: {name: string; count: number}[];
  fetched_at: string;
}
export const usage = usageJson as {sources: UsageSource[]};

/** 円グラフに出すのは上位5つ＋その他（6区分まで） */
export const TOP = 5;
/** 分類色の数。どの地域に切り替えても、同じデッキは同じ色にする */
export const COLORS = 8;

/**
 * デッキ→色番号。各情報源の上位5デッキを、全国→関東→関西の順に出てきた順で割り当てる。
 * 切り替えても色が入れ替わらないように、地域ごとの順位ではなくデッキで色を決める。
 */
export function colorMap(sources: UsageSource[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of sources)
    for (const d of s.decks.slice(0, TOP))
      if (!m.has(d.name) && m.size < COLORS) m.set(d.name, m.size + 1);
  return m;
}

export interface Slice {
  name: string;
  count: number;
  share: number;
  color: number | null;
  other?: boolean;
}

export function slices(u: UsageSource, colors: Map<string, number>): Slice[] {
  // 色が無い（9色目以降の）デッキは、その他にまとめる
  const top = u.decks
    .slice(0, TOP)
    .filter(d => colors.has(d.name))
    .map(d => ({...d, share: d.count / u.total, color: colors.get(d.name)!}));
  const shown = new Set(top.map(d => d.name));
  const rest = u.decks.filter(d => !shown.has(d.name)).reduce((s, d) => s + d.count, 0);
  return rest
    ? [...top, {name: 'その他', count: rest, share: rest / u.total, color: null, other: true}]
    : top;
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const swatch = (d: Slice) => (d.other ? 'usage-other' : `usage-s${d.color}`);

function arc(cx: number, cy: number, r: number, R: number, a0: number, a1: number) {
  const p = (rad: number, a: number) => [cx + rad * Math.sin(a), cy - rad * Math.cos(a)];
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = p(R, a0);
  const [x1, y1] = p(R, a1);
  const [x2, y2] = p(r, a1);
  const [x3, y3] = p(r, a0);
  return `M${x0} ${y0} A${R} ${R} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${r} ${r} 0 ${large} 0 ${x3} ${y3} Z`;
}

function Donut({
  src,
  data,
  active,
  setActive,
}: {
  src: UsageSource;
  data: Slice[];
  active: number | null;
  setActive: (i: number | null) => void;
}) {
  const size = 200;
  const c = size / 2;
  let a = 0;
  const hovered = active == null ? null : data[active];
  return (
    <svg
      className="usage-donut"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${src.label}のデッキの使用率。${data.map(d => `${d.name} ${pct(d.share)}`).join('、')}`}>
      {data.map((d, i) => {
        const a0 = a;
        a += d.share * Math.PI * 2;
        const a1 = data.length === 1 ? a - 0.0001 : a;
        return (
          <path
            key={d.name}
            d={arc(c, c, 58, active === i ? 96 : 92, a0, a1)}
            className={`usage-seg ${swatch(d)}`}
            onPointerEnter={() => setActive(i)}
            onPointerLeave={() => setActive(null)}>
            <title>{`${d.name}：${d.count}${src.unit}（${pct(d.share)}）`}</title>
          </path>
        );
      })}
      <text x={c} y={c - 6} textAnchor="middle" className="usage-center-main">
        {hovered ? pct(hovered.share) : src.label}
      </text>
      <text x={c} y={c + 16} textAnchor="middle" className="usage-center-sub">
        {hovered ? hovered.name : `${src.total}${src.unit}`}
      </text>
    </svg>
  );
}

function Events({src}: {src: UsageSource}) {
  if (!src.events.length) return null;
  return (
    <>
      集計した大会・記事：
      {src.events.map((e, i) => (
        <span key={e.url + e.name}>
          {i > 0 && '、'}
          <Link href={e.url} isExternalLink>
            {e.date && `${ymd(e.date).slice(5)} `}
            {e.name}
            {e.players != null && `（${e.players}人）`}
          </Link>
        </span>
      ))}
      。
    </>
  );
}

export default function UsageChart() {
  const sources = usage.sources;
  const [id, setId] = useState(sources[0]?.id ?? '');
  const [active, setActive] = useState<number | null>(null);
  const src = sources.find(s => s.id === id) ?? sources[0];
  if (!src) return null;
  const colors = colorMap(sources);
  const data = slices(src, colors);
  const max = src.decks[0]?.count ?? 1;
  const shown = data.filter(d => !d.other).length;
  return (
    <Card>
      <VStack gap={4}>
        <VStack gap={2}>
          <Heading level={2}>デッキの使用率</Heading>
          <SegmentedControl
            label="地域"
            value={src.id}
            onChange={v => {
              setId(v);
              setActive(null);
            }}>
            {sources.map(s => (
              <SegmentedControlItem key={s.id} value={s.id} label={s.label} />
            ))}
          </SegmentedControl>
          <Text size="sm" color="secondary">
            {ymd(src.from)}〜{ymd(src.to)}・{src.sample}。{src.metric}で数えています。
          </Text>
        </VStack>
        <div className="usage-main">
          <Donut src={src} data={data} active={active} setActive={setActive} />
          <ol className="usage-legend">
            {data.map((d, i) => (
              <li
                key={d.name}
                className={active === i ? 'is-active' : undefined}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}>
                <span className={`usage-swatch ${swatch(d)}`} />
                <span className="usage-legend-name">
                  {d.other ? (
                    `その他（${src.decks.length - shown}デッキ）`
                  ) : (
                    <a href={deckWikiUrl({name: d.name, note: ''})} target="_blank" rel="noreferrer">
                      {d.name}
                    </a>
                  )}
                </span>
                <span className="usage-legend-num">{pct(d.share)}</span>
                <span className="usage-legend-count">
                  {d.count}
                  {src.unit}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <Collapsible
          key={src.id}
          defaultIsOpen={false}
          trigger={<Text weight="semibold">全{src.decks.length}デッキの内訳</Text>}>
          <ol className="usage-bars">
            {src.decks.map(d => (
              <li key={d.name}>
                <span className="usage-bar-name">{d.name}</span>
                <span className="usage-bar-track">
                  <span className="usage-bar-fill" style={{width: `${(d.count / max) * 100}%`}} />
                </span>
                <span className="usage-bar-num">
                  {d.count}
                  {src.unit}・{pct(d.count / src.total)}
                </span>
              </li>
            ))}
          </ol>
        </Collapsible>

        <Text size="sm" color="secondary">
          {src.note}
          <Events src={src} />
          出典：
          <Link href={src.source.url} isExternalLink>
            {src.source.title}
          </Link>
          （{ymd(src.fetched_at)} 取得、毎週自動更新）
          {src.skipped > 0 && `。人数と分布の合計が合わなかった${src.skipped}大会は除外`}。
          地域ごとに数え方と件数が違うので、割合はそのまま比べられません。同じデッキはどの地域でも同じ色です。
        </Text>
      </VStack>
    </Card>
  );
}
