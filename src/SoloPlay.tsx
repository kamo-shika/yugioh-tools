import {ReactNode, useEffect, useMemo, useState} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {Drawer, DrawerHeader} from '@astryxdesign/core/Drawer';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {TextArea} from '@astryxdesign/core/TextArea';
import {VStack} from '@astryxdesign/core/Layout';
import {
  DEST_LABEL,
  Deck,
  SoloState,
  ZONE_LABEL,
  Zone,
  countSection,
  destinationsFor,
  draw,
  moveCard,
  parseDeckText,
  shuffleDeck,
  startGame,
  zoneOf,
} from './solo';

const STORAGE_KEY = 'ygo-solo-v1';
const UNDO_LIMIT = 50;

interface Saved {
  text: string;
  deck: Deck | null;
  game: SoloState | null;
}

function load(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Saved;
  } catch {
    /* 読めなければ空から */
  }
  return {text: '', deck: null, game: null};
}

type Pile = Extract<Zone, 'deck' | 'extra' | 'grave' | 'banish'>;

export default function SoloPlay({nav}: {nav: ReactNode}) {
  const [saved, setSaved] = useState<Saved>(load);
  const [importing, setImporting] = useState(() => saved.game === null);
  const [undo, setUndo] = useState<SoloState[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [openPile, setOpenPile] = useState<Pile | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      /* 保存できない環境でも動作は続ける */
    }
  }, [saved]);

  useEffect(() => {
    if (!confirmReset) return;
    const t = setTimeout(() => setConfirmReset(false), 3000);
    return () => clearTimeout(t);
  }, [confirmReset]);

  const game = saved.game;

  const update = (f: (s: SoloState) => SoloState) => {
    if (!game) return;
    const next = f(game);
    if (next === game) return;
    setUndo(u => [...u.slice(-(UNDO_LIMIT - 1)), game]);
    setSaved(s => ({...s, game: next}));
  };

  const back = () => {
    const prev = undo.at(-1);
    if (!prev) return;
    setUndo(u => u.slice(0, -1));
    setSaved(s => ({...s, game: prev}));
  };

  const reset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setConfirmReset(false);
    if (!saved.deck) return;
    setUndo([]);
    setSaved(s => ({...s, game: startGame(s.deck!)}));
  };

  const begin = (text: string, deck: Deck) => {
    setUndo([]);
    setSaved({text, deck, game: startGame(deck)});
    setImporting(false);
  };

  if (importing || !game || !saved.deck) {
    return (
      <DeckImport
        nav={nav}
        initialText={saved.text}
        canCancel={game !== null}
        onCancel={() => setImporting(false)}
        onStart={begin}
      />
    );
  }

  const z = game.zones;
  const card = (id: number) => game.cards[id];

  return (
    <div className="duel solo">
      <header className="duel-bar">
        {nav}
        <div className="duel-bar-actions">
          <Button label="デッキ" variant="ghost" onClick={() => setImporting(true)} />
          <Button label="戻す" variant="secondary" onClick={back} isDisabled={undo.length === 0} />
          <Button
            label={confirmReset ? 'もう一度押す' : 'リセット'}
            variant="destructive"
            onClick={reset}
          />
        </div>
      </header>

      <div className="solo-main">
        <aside className="solo-piles" aria-label="山札など">
          <PileButton zone="deck" count={z.deck.length} onOpen={() => setOpenPile('deck')} />
          <button
            type="button"
            className="act act-draw"
            onClick={() => update(s => draw(s))}
            disabled={z.deck.length === 0}>
            ドロー
          </button>
          <button type="button" className="act" onClick={() => update(s => shuffleDeck(s))}>
            シャッフル
          </button>
          <PileButton zone="extra" count={z.extra.length} onOpen={() => setOpenPile('extra')} />
          <PileButton zone="grave" count={z.grave.length} onOpen={() => setOpenPile('grave')} />
          <PileButton zone="banish" count={z.banish.length} onOpen={() => setOpenPile('banish')} />
        </aside>

        <section className="solo-board">
          <div className="solo-zone solo-field" role="region" aria-label="場">
            <span className="solo-zone-label">場</span>
            {z.field.length === 0 ? (
              <span className="solo-empty">手札のカードをタップして場に出す</span>
            ) : (
              z.field.map(id => (
                <CardChip key={id} name={card(id).name} isExtra={card(id).isExtra} onTap={() => setSelected(id)} />
              ))
            )}
          </div>
          <div className="solo-zone solo-hand" role="region" aria-label="手札">
            <span className="solo-zone-label">手札 {z.hand.length}</span>
            {z.hand.map(id => (
              <CardChip key={id} name={card(id).name} isExtra={card(id).isExtra} onTap={() => setSelected(id)} />
            ))}
          </div>
        </section>
      </div>

      <Drawer
        isOpen={openPile !== null}
        onOpenChange={o => !o && setOpenPile(null)}
        label={openPile ? ZONE_LABEL[openPile] : ''}
        side="end"
        width={340}>
        {openPile && (
          <>
            <DrawerHeader
              title={`${ZONE_LABEL[openPile]}（${z[openPile].length}枚）`}
              onOpenChange={o => !o && setOpenPile(null)}
            />
            <div className="drawer-body">
              {openPile === 'deck' && z.deck.length > 0 && (
                <Text type="supporting" color="secondary">
                  上から順に並んでいます。タップすると手札に加えるなどができます。
                </Text>
              )}
              {z[openPile].length === 0 ? (
                <Text color="secondary">カードはありません。</Text>
              ) : (
                <ul className="pile-list">
                  {z[openPile].map(id => (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenPile(null);
                          setSelected(id);
                        }}>
                        {card(id).name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </Drawer>

      <Drawer
        isOpen={selected !== null}
        onOpenChange={o => !o && setSelected(null)}
        label="カードを動かす"
        side="end"
        width={320}>
        {selected !== null && (
          <>
            <DrawerHeader title={card(selected).name} onOpenChange={o => !o && setSelected(null)} />
            <div className="drawer-body">
              <Text type="supporting" color="secondary">
                今は{ZONE_LABEL[zoneOf(game, selected) ?? 'deck']}にあります
              </Text>
              <div className="move-grid" role="group" aria-label="移動先">
                {destinationsFor(game, selected).map(d => (
                  <button
                    key={d}
                    type="button"
                    className={`act move-${d}`}
                    onClick={() => {
                      update(s => moveCard(s, selected, d));
                      setSelected(null);
                    }}>
                    {DEST_LABEL[d]}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}

function PileButton({zone, count, onOpen}: {zone: Zone; count: number; onOpen: () => void}) {
  return (
    <button type="button" className={`pile pile-${zone}`} onClick={onOpen} aria-label={`${ZONE_LABEL[zone]} ${count}枚`}>
      <span className="pile-name">{ZONE_LABEL[zone]}</span>
      <span className="pile-count">{count}</span>
    </button>
  );
}

function CardChip({name, isExtra, onTap}: {name: string; isExtra: boolean; onTap: () => void}) {
  return (
    <button type="button" className={`card-chip ${isExtra ? 'card-chip-extra' : ''}`} onClick={onTap}>
      <span className="card-chip-name">{name}</span>
    </button>
  );
}

function DeckImport({
  nav,
  initialText,
  canCancel,
  onCancel,
  onStart,
}: {
  nav: ReactNode;
  initialText: string;
  canCancel: boolean;
  onCancel: () => void;
  onStart: (text: string, deck: Deck) => void;
}) {
  const [text, setText] = useState(initialText);
  const {deck, warnings} = useMemo(() => parseDeckText(text), [text]);
  const main = countSection(deck, 'main');
  const extra = countSection(deck, 'extra');
  const side = countSection(deck, 'side');

  return (
    <main className="page">
      <VStack gap={4}>
        {nav}
        <Heading level={2}>デッキを読み込む</Heading>
        <ol className="import-steps">
          <li>遊戯王ニューロンでデッキのページを開く</li>
          <li>表示を「テキスト表示」に切り替える</li>
          <li>ページの文字を全部選んでコピーし、下に貼り付ける</li>
        </ol>
        <Text type="supporting" color="secondary">
          「黄金卿エルドリッチ ×3」のように1行1種類で手書きしても読めます。「エクストラ」「サイド」の行で区切ってください。
        </Text>
        <TextArea label="デッキレシピ" rows={8} value={text} onChange={setText} />
        {text.trim() !== '' && (
          <div className="import-preview" aria-live="polite">
            <Text>
              {deck.name && <strong>{deck.name}：</strong>}
              メイン {main}枚・EX {extra}枚・サイド {side}枚
            </Text>
            {warnings.map(w => (
              <Text key={w} color="secondary">
                ⚠ {w}
              </Text>
            ))}
            {main > 0 && (
              <details>
                <summary>読み取ったカード（{deck.entries.length}種類）</summary>
                <ul className="import-list">
                  {deck.entries.map(e => (
                    <li key={`${e.section}-${e.name}`}>
                      {e.section === 'extra' ? '［EX］' : e.section === 'side' ? '［サイド］' : ''}
                      {e.name} ×{e.count}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
        <div className="import-actions">
          {canCancel && <Button label="やめる" variant="ghost" onClick={onCancel} />}
          <Button
            label="このデッキで始める"
            variant="primary"
            isDisabled={main === 0}
            onClick={() => onStart(text, deck)}
          />
        </div>
      </VStack>
    </main>
  );
}
