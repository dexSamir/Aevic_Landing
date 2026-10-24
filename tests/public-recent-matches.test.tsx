import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';
import { PublicRecentMatches } from '../src/components/profile/PublicRecentMatches';
import type { MatchHistoryEntry } from '../src/types/domain';
const match = (id: number, map = 'Erangel'): MatchHistoryEntry => ({ id: String(id), tournamentId: 'cup', tournamentName: 'Real cup', playedAt: `2026-10-0${id}T12:00:00Z`, map, placement: id, finishes: id + 3, points: 20, wwcd: id === 1, stage: 'final', stageLabel: 'Final' });
it('shows five newest actual results and preserves result navigation without a disclosure', () => {
  const {container} = render(<MemoryRouter><PublicRecentMatches matches={[1,2,3,4,5,6].map(id=>match(id))}/></MemoryRouter>);
  const rows = screen.getAllByRole('listitem');
  expect(rows).toHaveLength(5);
  expect(within(rows[0]).getByLabelText('6-ci yer')).toBeInTheDocument();
  expect(within(rows[0]).getByText('9')).toBeInTheDocument();
  expect(within(rows[0]).getByRole('link')).toHaveAttribute('href','/tournaments/cup#results');
  expect(container.querySelector('details, summary, button')).toBeNull();
  expect(screen.getAllByLabelText('Raund sayı əlçatan deyil')).toHaveLength(5);
});
it('keeps fewer results, missing artwork and broken images honest', () => {
  const {container, rerender} = render(<MemoryRouter><PublicRecentMatches matches={[match(1,'Unknown map'),match(2,'Miramar')]}/></MemoryRouter>);
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
  expect(container.querySelectorAll('img')).toHaveLength(1);
  expect(container.querySelector('img')).toHaveAttribute('src',expect.stringContaining('miramar'));
  fireEvent.error(container.querySelector('img')!);
  expect(container.querySelector('img')).not.toBeVisible();
  rerender(<MemoryRouter><PublicRecentMatches matches={[]}/></MemoryRouter>);
  expect(screen.queryByRole('list')).toBeNull();
  expect(screen.getByText(/mövcud nəticələr sahəsində matç yoxdur/)).toBeInTheDocument();
});
