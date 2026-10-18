import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { RecentPlacementStrip } from '../src/components/common/RecentPlacementStrip';
import { MapPerformance } from '../src/components/profile/MapPerformance';
import { PublicSessionProvider } from '../src/services/PublicSessionContext';
import { PublicHeader } from '../src/layouts/layouts';
import { services } from '../src/services';
import { ApiError } from '../src/services/apiError';
import { currentTeam } from './fixtures/platform-data';

describe('unified placement contract', () => {
  it('keeps real results newest first, stacked WWCD wins and contextual accessible labels', () => {
    const results = [{ id:'old',placement:1,map:'Miramar',playedAt:'2026-01-01' },{ id:'new',placement:3,map:'Rondo',playedAt:'2026-02-01' },{id:'missing',placement:null}];
    const view=render(<RecentPlacementStrip results={results}/>);
    expect([...view.container.querySelectorAll('li')].map(el=>el.textContent)).toEqual(['3','WWCD']);
    expect(screen.getByLabelText(/1-ci yer · Miramar/)).toHaveAttribute('data-winner','true');
    expect(screen.queryByLabelText('Yer məlum deyil')).not.toBeInTheDocument();
    expect(results[0].id).toBe('old');
  });
  it('preserves small sample eligibility and a true win proportion',()=>{
    render(<MapPerformance specialization={{minimumSampleSize:3,metrics:[{map:'Erangel',matches:2,averagePlacement:1,wwcd:1},{map:'Miramar',matches:8,averagePlacement:5,wwcd:2}]} as never}/>);
    expect(screen.queryByText('Ən yaxşı orta yer')).not.toBeInTheDocument();
    expect(screen.getByRole('meter',{name:'Erangel qələbə faizi'})).toHaveAttribute('value','0.5');
    expect(screen.getByText(/Məhdud nümunə/)).toBeInTheDocument();
  });
});
it('never renders guest actions before verification and retains identity on public navigation',async()=>{
  let resolve!:(value:Awaited<ReturnType<typeof services.auth.getSession>>)=>void;
  const read=vi.spyOn(services.auth,'getSession').mockImplementation(()=>new Promise(r=>{resolve=r;}));
  vi.spyOn(services.teams,'current').mockResolvedValue(currentTeam);
  render(<MemoryRouter><PublicSessionProvider><PublicHeader/><Link to="/teams/test">Navigate fixture</Link></PublicSessionProvider></MemoryRouter>);
  expect(screen.getByRole('status',{name:'Sessiya yoxlanılır'})).toBeInTheDocument();
  expect(screen.queryByRole('link',{name:'Daxil ol'})).not.toBeInTheDocument();
  await act(async()=>resolve({user:currentTeam.captain,role:'team'}));
  await screen.findByRole('button',{name:/hesab menyusu/});
  fireEvent.click(screen.getByText('Navigate fixture'));
  expect(screen.queryByRole('link',{name:'Daxil ol'})).not.toBeInTheDocument();
  expect(read).toHaveBeenCalledTimes(1);
});
it('offers recovery on verification failure and shows genuine expiration after retry',async()=>{
  const read=vi.spyOn(services.auth,'getSession').mockRejectedValue(new ApiError({status:503,kind:'server',retryAllowed:false}));
  render(<MemoryRouter><PublicSessionProvider><PublicHeader/></PublicSessionProvider></MemoryRouter>);
  const retry=await screen.findByRole('button',{name:'Sessiya yoxlanmadı. Yenidən yoxla'});
  expect(screen.queryByRole('link',{name:'Daxil ol'})).not.toBeInTheDocument();
  read.mockResolvedValue(null);fireEvent.click(retry);
  await waitFor(()=>expect(screen.getByRole('link',{name:'Daxil ol'})).toBeInTheDocument());
});
