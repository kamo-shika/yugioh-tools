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
import RegulationView from './RegulationView';

type Tab = 'duel' | 'prob' | 'reg';
const HASH: Record<Tab, string> = {duel: '#', prob: '#prob', reg: '#reg'};

export default function App() {
  const [tab, setTab] = useState<Tab>(() =>
    location.hash === '#prob' ? 'prob' : location.hash === '#reg' ? 'reg' : 'duel',
  );
  const change = (t: string) => {
    setTab(t as Tab);
    history.replaceState(null, '', HASH[t as Tab]);
  };

  const nav = (
    <SegmentedControl label="ツール" value={tab} onChange={change}>
      <SegmentedControlItem value="duel" label="ライフ" />
      <SegmentedControlItem value="prob" label="初手確率" />
      <SegmentedControlItem value="reg" label="規制・環境" />
    </SegmentedControl>
  );

  return (
    <Theme theme={neutralTheme}>
      {tab === 'duel' ? (
        <DuelTools nav={nav} />
      ) : (
        <main className={tab === 'reg' ? 'page reg-page' : 'page'}>
          <VStack gap={5}>
            {nav}
            {tab === 'prob' ? <ProbabilityCalc /> : <RegulationView />}
          </VStack>
        </main>
      )}
    </Theme>
  );
}
