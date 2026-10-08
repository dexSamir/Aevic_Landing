import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { it, expect, vi } from 'vitest';
import { PublicTeamComparisonPage } from '../src/pages/routes/PublicTeamComparisonPage';
import type { PublicTeamSummary, TeamComparisonRecord } from '../src/types/domain';
const data = vi.hoisted(() => ({teams: [] as PublicTeamSummary[], teamComparisonRecords: [] as TeamComparisonRecord[]}));
vi.mock('../src/services/PublicPlatformDataContext', () => ({usePublicPlatformData: () => data}));
const teams = [{id:'12',slug:'alpha',name:'Alpha',rosterSize:4},{id:'10',slug:'beta',name:'Beta',rosterSize:4}];
const records = teams.map(t => ({teamId:t.id,teamName:t.name,matches:1,finishes:5,wwcd:0}));
function page(query: string) { return <MemoryRouter initialEntries={[`/teams/compare?${query}`]}><PublicTeamComparisonPage /></MemoryRouter>; }
it.each(['team=12&opponent=10','team=alpha&opponent=beta'])('restores direct URL selection: %s', query => {
  Object.assign(data,{teams,teamComparisonRecords:records}); render(page(query));
  expect(screen.getByLabelText('Birinci komanda')).toHaveValue('12');
  expect(screen.getByLabelText('İkinci komanda')).toHaveValue('10');
  expect(screen.getByRole('heading',{name:'Alpha'})).toBeInTheDocument();
});
it('resolves delayed identities and records without resetting a manual choice', () => {
  Object.assign(data,{teams:[],teamComparisonRecords:[]}); const view=render(page('team=12&opponent=10'));
  Object.assign(data,{teams,teamComparisonRecords:records}); view.rerender(page('team=12&opponent=10'));
  expect(screen.getByLabelText('Birinci komanda')).toHaveValue('12');
  fireEvent.change(screen.getByLabelText('Birinci komanda'),{target:{value:'10'}});
  expect(screen.getByRole('alert')).toHaveTextContent('iki fərqli komanda');
  data.teamComparisonRecords=[...records]; view.rerender(page('team=12&opponent=10'));
  expect(screen.getByLabelText('Birinci komanda')).toHaveValue('10');
});
it('does not substitute an unrelated team for an invalid URL identifier', () => {
  Object.assign(data,{teams,teamComparisonRecords:records}); render(page('team=missing&opponent=10'));
  expect(screen.getByLabelText('Birinci komanda')).toHaveValue('');
  expect(screen.getByRole('alert')).toHaveTextContent('URL-dəki komanda tapılmadı');
});
