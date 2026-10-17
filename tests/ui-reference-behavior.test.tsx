import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MapPerformance } from '../src/components/profile/MapPerformance';
import { TournamentCalendar } from '../src/components/competition/TournamentCalendar';
import { tournaments } from './fixtures/platform-data';

const metrics = [
  { map: 'Rondo', matches: 16, averagePlacement: 5.2, wwcd: 2 },
  { map: 'Erangel', matches: 23, averagePlacement: 5.4, wwcd: 4 },
  { map: 'Miramar', matches: 23, averagePlacement: 5.4, wwcd: 3 },
];
describe('reference map composition', () => {
  it('updates the featured map from real averages without mutating source order', () => {
    const view = render(<MapPerformance specialization={{ metrics, minimumSampleSize: 3 }} />);
    expect(view.container.querySelector('.map-performance-card--featured h3')).toHaveTextContent('Rondo');
    expect(within(screen.getByRole('article', { name: 'Rondo statistikası' })).getByText('13%')).toBeInTheDocument();
    for (const name of ['Rondo', 'Erangel', 'Miramar']) {
      expect(screen.getByRole('article', { name: `${name} statistikası` }).querySelector('img')?.getAttribute('src')).toContain(name.toLowerCase());
    }
    view.rerender(<MapPerformance specialization={{ metrics: metrics.map(map => map.map === 'Erangel' ? { ...map, averagePlacement: 3.1 } : map), minimumSampleSize: 3 }} />);
    expect(view.container.querySelector('.map-performance-card--featured h3')).toHaveTextContent('Erangel');
    expect(metrics[0].map).toBe('Rondo');
  });
  it('breaks ties by sample size then name and never treats no matches as a win', () => {
    const tied = metrics.map(map => ({ ...map, averagePlacement: 4 }));
    const view = render(<MapPerformance specialization={{ metrics: [...tied].reverse(), minimumSampleSize: 3 }} />);
    expect(view.container.querySelector('.map-performance-card--featured h3')).toHaveTextContent('Erangel');
    view.rerender(<MapPerformance specialization={{ metrics: [{ map: 'Rondo', matches: 0, averagePlacement: 0, wwcd: 0 }, metrics[1]], minimumSampleSize: 3 }} />);
    expect(view.container.querySelector('.map-performance-card--featured h3')).toHaveTextContent('Erangel');
    expect(within(screen.getByRole('article', { name: 'Rondo statistikası' })).queryByText('0%')).not.toBeInTheDocument();
  });
});
describe('cinematic calendar', () => {
  const events = [
    { ...tournaments[0], id: 'first', startsAt: '2026-08-20T08:00:00Z', endsAt: '2026-08-21T08:00:00Z' },
    { ...tournaments[0], id: 'second', name: 'İkinci yarış', shortName: 'İkinci', startsAt: '2026-08-20T12:00:00Z', endsAt: '2026-08-21T08:00:00Z' },
  ];
  it('keeps six calendar weeks and switches actual same-day events and empty days', () => {
    const view = render(<MemoryRouter><TournamentCalendar tournaments={events} compact overview cinematic currentTime={new Date('2026-09-10')} /></MemoryRouter>);
    const dates = () => view.container.querySelectorAll('.tournament-calendar__days button');
    expect(dates()).toHaveLength(42);
    expect(dates()[0]).toHaveAttribute('data-calendar-date', '2026-07-27');
    fireEvent.click(screen.getByRole('button', { name: 'İkinci', exact: true }));
    expect(view.container.querySelector('.calendar-event-inspector h3')).toHaveTextContent('İkinci yarış');
    expect(screen.getByRole('link', { name: 'Turnir detalları' })).toHaveAttribute('href', '/tournaments/second');
    const empty = view.container.querySelector('[data-calendar-date="2026-08-22"]')!;
    fireEvent.click(empty);
    expect(screen.getByText('Bu gün turnir yoxdur.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Növbəti ay' }));
    expect(dates()).toHaveLength(42);
    expect(dates()[0]).toHaveAttribute('data-calendar-date', '2026-08-31');
    fireEvent.click(screen.getByRole('button', { name: 'Əvvəlki ay' }));
    expect(dates()).toHaveLength(42);
    expect(view.container.querySelector('.tournament-calendar__month')).toHaveAttribute('data-direction', 'previous');
  });
  it('uses adjacent-day keyboard navigation across the month boundary', () => {
    const view = render(<MemoryRouter><TournamentCalendar tournaments={events} compact overview cinematic currentTime={new Date('2026-09-10')} /></MemoryRouter>);
    const last = view.container.querySelector<HTMLButtonElement>('[data-calendar-date="2026-08-31"]')!;
    fireEvent.click(last);
    fireEvent.keyDown(last, { key: 'ArrowRight' });
    expect(view.container.querySelector('.tournament-calendar__days [aria-pressed="true"]')).toHaveAttribute('data-calendar-date', '2026-09-01');
  });
});
