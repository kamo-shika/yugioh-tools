import {useState} from 'react';
import {Theme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral/built';
import {VStack} from '@astryxdesign/core/Layout';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import DuelTools from './DuelTools';
import ProbabilityCalc from './ProbabilityCalc';

type Tab = 'duel' | 'prob';

export default function App() {
  const [tab, setTab] = useState<Tab>(() =>
    location.hash === '#prob' ? 'prob' : 'duel',
  );
  const change = (t: string) => {
    setTab(t as Tab);
    history.replaceState(null, '', t === 'prob' ? '#prob' : '#');
  };

  const nav = (
    <SegmentedControl label="ツール" value={tab} onChange={change}>
      <SegmentedControlItem value="duel" label="ライフ" />
      <SegmentedControlItem value="prob" label="初手確率" />
    </SegmentedControl>
  );

  return (
    <Theme theme={neutralTheme}>
      {tab === 'duel' ? (
        <DuelTools nav={nav} />
      ) : (
        <main className="page">
          <VStack gap={5}>
            {nav}
            <ProbabilityCalc />
          </VStack>
        </main>
      )}
    </Theme>
  );
}
