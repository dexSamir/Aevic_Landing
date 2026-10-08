import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { it, expect, vi } from 'vitest';
import { PublicSessionProvider } from '../src/services/PublicSessionContext';
import { TournamentJoinAction } from '../src/components/competition/TournamentJoinAction';
import { services } from '../src/services';
import { ApiError } from '../src/services/apiError';
import { currentTeam, tournaments } from './fixtures/platform-data';
it('shares identity for multiple join controls and retries a failed account read explicitly', async () => {
  const session=vi.spyOn(services.auth,'getSession').mockResolvedValue({user:currentTeam.captain,role:'team'});
  const team=vi.spyOn(services.teams,'current').mockRejectedValueOnce(new ApiError({status:503,kind:'server'})).mockResolvedValue(currentTeam);
  vi.spyOn(services.tournaments,'slots').mockResolvedValue([{number:1,tournamentId:tournaments[0].id,teamId:currentTeam.id,state:'occupied'}]);
  render(<MemoryRouter><PublicSessionProvider><TournamentJoinAction tournament={tournaments[0]} /><TournamentJoinAction tournament={tournaments[0]} /></PublicSessionProvider></MemoryRouter>);
  const retry=await screen.findAllByRole('button',{name:'Yenidən yoxla'});
  expect(session).toHaveBeenCalledTimes(1);expect(team).toHaveBeenCalledTimes(1);
  fireEvent.click(retry[0]);
  await waitFor(()=>expect(screen.getAllByRole('button',{name:'Qeydiyyatdan keçib'})).toHaveLength(2));
  expect(session).toHaveBeenCalledTimes(2);expect(team).toHaveBeenCalledTimes(2);
});
