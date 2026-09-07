import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlacementScoring } from '../src/components/competition/PlacementScoring';

describe('compact placement formula', () => {
  it('preserves every rank and point value across two reading groups, including zero points', () => {
    const values = [15, 12, 10, 8, 6, 4, 3, 2, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0];
    render(<PlacementScoring placements={values.map((points, index) => ({ placement: index + 1, points }))} />);
    const tables = screen.getAllByRole('table');
    expect(tables).toHaveLength(2);
    expect(tables[0]).toHaveAccessibleName('Yer xalları · #1–#10');
    expect(tables[1]).toHaveAccessibleName('Yer xalları · #11–#20');
    values.forEach((points, index) => {
      const row = screen.getByRole('rowheader', { name: `#${index + 1}`, exact: true }).closest('tr')!;
      expect(within(row).getByRole('cell')).toHaveTextContent(String(points));
    });
  });

  it('handles a shorter odd-sized formula without inventing extra ranks', () => {
    render(<PlacementScoring placements={[{ placement: 1, points: 7 }, { placement: 2, points: 3 }, { placement: 3, points: 0 }]} />);
    expect(screen.getAllByRole('rowheader')).toHaveLength(3);
    expect(screen.getByRole('table', { name: 'Yer xalları · #1–#2' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Yer xalları · #3–#3' })).toBeInTheDocument();
  });
});
