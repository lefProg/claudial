import React from 'react';
import { render } from 'ink';
import { TakeoverView } from '../src/ui/TakeoverView.js';

const match = {
  id: 1, group: 'Group B',
  home: { name: 'Canada', code: 'CAN' }, away: { name: 'Bosnia & Herzegovina', code: 'BIH' },
  homeScore: 0, awayScore: 1, status: 'live' as const, statusText: '1st half',
  minute: 21, startTimestamp: 0, varInProgress: false,
};
const kind = (process.argv[2] ?? 'goal') as 'goal' | 'redcard' | 'var';
const data = {
  goal: { kind: 'goal' as const, match, who: 'Jovo Lukić', detail: null, minute: 21, homeScore: 0, awayScore: 1 },
  redcard: { kind: 'redcard' as const, match, who: 'Ermedin Demirović', detail: null, minute: 55, homeScore: 0, awayScore: 1 },
  var: { kind: 'var' as const, match, who: null, detail: 'Goal not awarded', minute: 63, homeScore: 0, awayScore: 1 },
};
render(<TakeoverView takeover={data[kind]} />);
