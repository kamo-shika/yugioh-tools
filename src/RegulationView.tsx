import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Card} from '@astryxdesign/core/Card';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Link} from '@astryxdesign/core/Link';
import {Banner} from '@astryxdesign/core/Banner';
import {TextInput} from '@astryxdesign/core/TextInput';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import {
  CardType,
  RegCard,
  RegChange,
  TYPES,
  TYPE_LABEL,
  cardUrl,
  levelClass,
  matches,
  meta,
  regulation as reg,
  ymd,
} from './regulation';
import './regulation.css';

type Level = 'forbidden' | 'limited' | 'semi_limited';
const LEVELS: {key: Level; label: string; limit: string}[] = [
  {key: 'forbidden', label: '禁止', limit: '0枚'},
  {key: 'limited', label: '制限', limit: '1枚まで'},
  {key: 'semi_limited', label: '準制限', limit: '2枚まで'},
];

function CardName({card}: {card: RegCard}) {
  const href = cardUrl(card.cid);
  return href ? (
    <a className="reg-card-link" href={href} target="_blank" rel="noreferrer">
      {card.name}
    </a>
  ) : (
    <span>{card.name}</span>
  );
}

function Level({value}: {value: string}) {
  return <span className={`reg-level ${levelClass(value)}`}>{value}</span>;
}

function ChangeRow({c}: {c: RegChange}) {
  return (
    <li className={`reg-change type-${c.type}`}>
      <CardName card={c} />
      <span className="reg-change-arrow">
        <Level value={c.from} />
        <span aria-label="から">→</span>
        <Level value={c.to} />
      </span>
    </li>
  );
}

function Changes() {
  const stricter = reg.changes.filter(c => c.stricter);
  const looser = reg.changes.filter(c => !c.stricter);
  return (
    <Card>
      <VStack gap={4}>
        <Heading level={2}>
          {reg.previous ? `前回（${ymd(reg.previous)}）からの変更` : '今回の変更'}
          <span className="reg-count">{reg.changes.length}枚</span>
        </Heading>
        <div className="reg-two-col">
          <section>
            <h3 className="reg-sub reg-sub-up">▲ 規制強化 {stricter.length}枚</h3>
            <ul className="reg-change-list">
              {stricter.map(c => (
                <ChangeRow key={c.name} c={c} />
              ))}
            </ul>
          </section>
          <section>
            <h3 className="reg-sub reg-sub-down">▼ 緩和 {looser.length}枚</h3>
            <ul className="reg-change-list">
              {looser.map(c => (
                <ChangeRow key={c.name} c={c} />
              ))}
            </ul>
          </section>
        </div>
        <TypeLegend />
      </VStack>
    </Card>
  );
}

function TypeLegend() {
  return (
    <div className="reg-legend" aria-label="カードの種類の色">
      {TYPES.map(t => (
        <span key={t} className={`reg-legend-item type-${t}`}>
          {TYPE_LABEL[t]}
        </span>
      ))}
    </div>
  );
}

function MetaTiers() {
  return (
    <Card>
      <VStack gap={4}>
        <Heading level={2}>いまの環境</Heading>
        <Text>{meta.summary}</Text>
        <div className="reg-tiers">
          {meta.tiers.map((t, i) => (
            <div key={t.tier} className={`reg-tier reg-tier-${i}`}>
              <div className="reg-tier-label">{t.tier}</div>
              <div className="reg-tier-decks">
                {t.decks.map(d => (
                  <div key={d.name} className="reg-deck">
                    <span className="reg-deck-name">【{d.name}】</span>
                    {d.note && <span className="reg-deck-note">{d.note}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <h3 className="reg-sub">改定ごとの上位デッキ</h3>
        <ol className="reg-history">
          {meta.history.map(h => (
            <li key={h.from}>
              <span className="reg-history-date">{ymd(h.from)}〜</span>
              <span className="reg-history-decks">
                {h.top.map((d, i) => (
                  <span key={d} className={`reg-history-deck rank-${i}`}>
                    {d}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ol>
        <Text size="sm" color="secondary">
          出典：
          <Link href={meta.source.url} isExternalLink>
            {meta.source.title}
          </Link>
          （Wikiの更新 {ymd(meta.source.modified)}、{ymd(meta.updated)} 確認）。{meta.note}
        </Text>
      </VStack>
    </Card>
  );
}

function FullList() {
  const [level, setLevel] = useState<Level>('limited');
  const [q, setQ] = useState('');
  const cards = useMemo(() => {
    const all = q
      ? LEVELS.flatMap(l => reg[l.key].map(c => ({...c, level: l.label})))
      : reg[level].map(c => ({...c, level: ''}));
    return all.filter(c => !q || matches(c.name, q));
  }, [level, q]);

  return (
    <Card>
      <VStack gap={4}>
        <Heading level={2}>一覧</Heading>
        <HStack gap={4} wrap="wrap" vAlign="end">
          <SegmentedControl label="区分" value={level} onChange={v => setLevel(v as Level)}>
            {LEVELS.map(l => (
              <SegmentedControlItem
                key={l.key}
                value={l.key}
                label={`${l.label} ${reg[l.key].length}`}
              />
            ))}
          </SegmentedControl>
          <TextInput label="カード名で探す（全区分）" value={q} onChange={setQ} width={240} />
        </HStack>
        {q && cards.length === 0 && (
          <Text color="secondary">「{q}」は規制されていません（無制限）。</Text>
        )}
        {TYPES.map(t => {
          const list = cards.filter(c => c.type === (t as CardType));
          if (!list.length) return null;
          return (
            <section key={t}>
              <h3 className={`reg-sub type-head type-${t}`}>
                {TYPE_LABEL[t]} <span className="reg-count">{list.length}</span>
              </h3>
              <ul className="reg-chips">
                {list.map(c => (
                  <li key={c.name} className={`reg-chip type-${t}`}>
                    <CardName card={c} />
                    {c.level && <Level value={c.level} />}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </VStack>
    </Card>
  );
}

export default function RegulationView() {
  return (
    <VStack gap={5}>
      <div className="reg-head">
        <div>
          <Text size="sm" color="secondary">
            適用中のリミットレギュレーション
          </Text>
          <div className="reg-date">{ymd(reg.date)}</div>
        </div>
        <div className="reg-stats">
          {LEVELS.map(l => (
            <div key={l.key} className={`reg-stat ${levelClass(l.label)}`}>
              <span className="reg-stat-label">{l.label}</span>
              <span className="reg-stat-num">{reg[l.key].length}</span>
              <span className="reg-stat-limit">{l.limit}</span>
            </div>
          ))}
        </div>
      </div>

      {reg.upcoming ? (
        <Banner
          status="warning"
          title={`次の改定が発表されています（${ymd(reg.upcoming)} 適用）`}
          description="公式サイトで内容を確認してください。適用日になるとこのページも切り替わります。"
        />
      ) : (
        <Text size="sm" color="secondary">
          次の改定はまだ発表されていません。
        </Text>
      )}

      <div className="reg-grid">
        <Changes />
        <MetaTiers />
      </div>
      <FullList />

      <Text size="sm" color="secondary">
        規制は
        <Link href={reg.source} isExternalLink>
          公式カードデータベース
        </Link>
        から毎週自動で取得（{ymd(reg.fetched_at)} 取得）。カード名を押すと公式DBのページが開きます。
      </Text>
    </VStack>
  );
}
