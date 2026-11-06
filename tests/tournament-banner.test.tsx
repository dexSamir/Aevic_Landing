import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { TournamentRow } from '../src/components/competition/TournamentRow';
import { TournamentDetailPage } from '../src/pages/routes/TournamentDetailPage';
import { tournaments } from './fixtures/platform-data';
const banner='/api/media/tournament-banners/11111111-1111-4111-8111-111111111111';
vi.mock('../src/services/PublicPlatformDataContext',async()=>{const fixture=await import('./fixtures/platform-data');const snapshot={tournaments:fixture.tournaments.map(t=>({...t,bannerUrl:'/api/media/tournament-banners/11111111-1111-4111-8111-111111111111'})),teams:fixture.teams,leaderboardTeams:[]};return {usePublicPlatformData:()=>snapshot};});
it('renders the tournament-owned banner on its public card',()=>{
 const view=render(<MemoryRouter><TournamentRow tournament={{...tournaments[0],bannerUrl:banner}} now={new Date(tournaments[0].startsAt)}/></MemoryRouter>);
 expect(view.container.querySelector('.tournament-row__thumbnail>img')).toHaveAttribute('src',banner);
});
it('uses the banner as the detail hero and client share image',async()=>{
 const view=render(<MemoryRouter initialEntries={[`/tournaments/${tournaments[0].id}`]}><Routes><Route path="/tournaments/:tournamentId" element={<TournamentDetailPage/>}/></Routes></MemoryRouter>);
 expect(view.container.querySelector('.tournament-detail-hero.has-banner>.tournament-detail-banner')).toHaveAttribute('src',banner);
 await waitFor(()=>expect(document.head.querySelector('meta[property="og:image"]')?.getAttribute('content')).toContain(banner));
});
