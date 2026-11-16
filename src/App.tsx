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
import SoloPlay from './SoloPlay';
import UpdateBanner from './UpdateBanner';

type Tab = 'duel' | 'solo' | 'prob' | 'reg';
const HASH: Record<Tab, string> = {duel: '#', solo: '#solo', prob: '#prob', reg: '#reg'};
const fromHash = (h: string): Tab =>
  h === '#solo' ? 'solo' : h === '#prob' ? 'prob' : h === '#reg' ? 'reg' : 'duel';

export default function App() {
  const [tab, setTab] = useState<Tab>(() => fromHash(location.hash));
  const change = (t: string) => {
    setTab(t as Tab);
    history.replaceState(null, '', HASH[t as Tab]);
  };

  const nav = (
    <SegmentedControl label="ツール" value={tab} onChange={change}>
      <SegmentedControlItem value="duel" label="ライフ" />
      <SegmentedControlItem value="solo" label="一人回し" />
      <SegmentedControlItem value="prob" label="初手確率" />
      <SegmentedControlItem value="reg" label="規制・環境" />
    </SegmentedControl>
  );

  return (
    <Theme theme={neutralTheme}>
      <UpdateBanner />
      {tab === 'duel' ? (
        <DuelTools nav={nav} />
      ) : tab === 'solo' ? (
        <SoloPlay nav={nav} />
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
