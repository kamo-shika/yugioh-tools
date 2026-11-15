import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Card} from '@astryxdesign/core/Card';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Badge} from '@astryxdesign/core/Badge';
import {NumberInput} from '@astryxdesign/core/NumberInput';
import {TextInput} from '@astryxdesign/core/TextInput';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {Divider} from '@astryxdesign/core/Divider';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import {allOf, atLeast} from './hypergeometric';

interface GroupState {
  id: number;
  name: string;
  copies: number;
  min: number;
}

const pct = (p: number) => `${(p * 100).toFixed(2)}%`;

let nextId = 3;

export default function ProbabilityCalc() {
  const [deck, setDeck] = useState(40);
  const [turn, setTurn] = useState<'first' | 'second' | 'custom'>('first');
  const [customDraw, setCustomDraw] = useState(5);
  const [groups, setGroups] = useState<GroupState[]>([
    {id: 1, name: '初動札', copies: 9, min: 1},
    {id: 2, name: '妨害札', copies: 6, min: 1},
  ]);

  const draw = turn === 'first' ? 5 : turn === 'second' ? 6 : customDraw;
  const used = groups.reduce((s, g) => s + g.copies, 0);
  const overflow = used > deck;

  const combined = useMemo(
    () => (overflow ? 0 : allOf(deck, draw, groups)),
    [deck, draw, groups, overflow],
  );

  const update = (id: number, patch: Partial<GroupState>) =>
    setGroups(gs => gs.map(g => (g.id === id ? {...g, ...patch} : g)));
  const remove = (id: number) => setGroups(gs => gs.filter(g => g.id !== id));
  const add = () =>
    setGroups(gs => [
      ...gs,
      {id: nextId++, name: `グループ${gs.length + 1}`, copies: 3, min: 1},
    ]);

  return (
        <VStack gap={6}>
          <Text color="secondary">
            デッキ枚数・採用枚数・ドロー枚数から、初手で狙ったカードを引ける確率を計算します（超幾何分布）。
          </Text>

          <Card>
            <VStack gap={4}>
              <Heading level={2}>デッキと手札</Heading>
              <HStack gap={4} wrap="wrap" vAlign="end">
                <NumberInput
                  label="デッキ枚数"
                  value={deck}
                  min={1}
                  max={60}
                  onChange={v => setDeck(Math.max(1, Math.round(v)))}
                  width={140}
                />
                <SegmentedControl
                  label="手札枚数"
                  value={turn}
                  onChange={v => setTurn(v as typeof turn)}>
                  <SegmentedControlItem value="first" label="先攻 5枚" />
                  <SegmentedControlItem value="second" label="後攻 6枚" />
                  <SegmentedControlItem value="custom" label="指定" />
                </SegmentedControl>
                {turn === 'custom' && (
                  <NumberInput
                    label="引く枚数"
                    value={customDraw}
                    min={1}
                    max={deck}
                    onChange={v => setCustomDraw(Math.max(1, Math.round(v)))}
                    width={120}
                  />
                )}
              </HStack>
            </VStack>
          </Card>

          <Card>
            <VStack gap={4}>
              <HStack gap={2} hAlign="between" vAlign="center">
                <Heading level={2}>引きたいカード</Heading>
                <Badge
                  variant={overflow ? 'error' : 'neutral'}
                  label={`合計 ${used} / ${deck} 枚`}
                />
              </HStack>
              <Text type="supporting" color="secondary">
                グループごとに「デッキに何枚入っているか」と「最低何枚引きたいか」を入れてください。すべての条件を同時に満たす確率を出します。同じカードを複数のグループに入れないでください。
              </Text>
              {groups.map(g => (
                <div className="group-row" key={g.id}>
                  <TextInput
                    label="名前"
                    value={g.name}
                    onChange={v => update(g.id, {name: v})}
                  />
                  <NumberInput
                    label="採用枚数"
                    value={g.copies}
                    min={0}
                    max={deck}
                    onChange={v => update(g.id, {copies: Math.max(0, Math.round(v))})}
                  />
                  <NumberInput
                    label="最低枚数"
                    value={g.min}
                    min={0}
                    max={draw}
                    onChange={v => update(g.id, {min: Math.max(0, Math.round(v))})}
                  />
                  <Button
                    label="削除"
                    variant="ghost"
                    onClick={() => remove(g.id)}
                    isDisabled={groups.length <= 1}
                  />
                </div>
              ))}
              <HStack>
                <Button label="グループを追加" variant="secondary" onClick={add} />
              </HStack>
            </VStack>
          </Card>

          <Card variant="muted">
            <VStack gap={3}>
              <Text type="label" color="secondary">
                すべての条件を満たす確率（{draw}枚引き）
              </Text>
              <div className="big-number">{overflow ? '—' : pct(combined)}</div>
              {overflow ? (
                <Text color="secondary">採用枚数の合計がデッキ枚数を超えています。</Text>
              ) : (
                <ProgressBar label="確率" isLabelHidden value={combined * 100} max={100} />
              )}
              <Divider />
              <VStack gap={2}>
                {groups.map(g => {
                  const p = overflow ? 0 : atLeast(deck, g.copies, draw, g.min);
                  return (
                    <HStack key={g.id} gap={2} hAlign="between">
                      <Text>
                        {g.name}（{g.copies}枚中 {g.min}枚以上）
                      </Text>
                      <Text weight="bold" hasTabularNumbers>
                        {overflow ? '—' : pct(p)}
                      </Text>
                    </HStack>
                  );
                })}
              </VStack>
            </VStack>
          </Card>

          <ReferenceTable deck={deck} />
        </VStack>
  );
}

function ReferenceTable({deck}: {deck: number}) {
  const rows = [1, 2, 3, 6, 9, 12, 15];
  return (
    <Card>
      <VStack gap={3}>
        <Heading level={2}>早見表：1枚以上引く確率（{deck}枚デッキ）</Heading>
        <div className="table-scroll">
          <table className="ref-table">
            <thead>
              <tr>
                <th>採用枚数</th>
                <th>先攻 5枚</th>
                <th>後攻 6枚</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .filter(r => r <= deck)
                .map(r => (
                  <tr key={r}>
                    <td>{r}枚</td>
                    <td>{pct(atLeast(deck, r, 5, 1))}</td>
                    <td>{pct(atLeast(deck, r, 6, 1))}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </VStack>
    </Card>
  );
}
