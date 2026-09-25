import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { FollowingPage } from '../src/pages/routes/FollowingPage';
import { services } from '../src/services';
import { clearQueryCache } from '../src/services/queryCache';
vi.mock('../src/services', () => ({services:{auth:{getSession:vi.fn()},follows:{list:vi.fn(),mutate:vi.fn()}}}));
beforeEach(() => { clearQueryCache('all'); vi.resetAllMocks(); });
it('offers sign-in without requesting a private inbox for a visitor', async () => {
 vi.mocked(services.auth.getSession).mockResolvedValue(null);
 render(<MemoryRouter><FollowingPage /></MemoryRouter>);
 expect(await screen.findByRole('link',{name:'Daxil ol'})).toHaveAttribute('href','/login');
 expect(services.follows!.list).not.toHaveBeenCalled();
});
it('links real team profiles and removes a follow only after successful persistence', async () => {
 vi.mocked(services.auth.getSession).mockResolvedValue({role:'captain',user:{id:'1',email:'test@example.invalid',firstName:'Test',lastName:'Captain',role:'captain'}});
 const followed={entityType:'TEAM' as const,entityId:'2',following:true,source:'backend' as const,team:{id:'2',slug:'north-wolves',name:'North Wolves',rosterSize:4}};
 vi.mocked(services.follows!.list).mockResolvedValue([followed]);
 vi.mocked(services.follows!.mutate).mockRejectedValueOnce(new Error('offline')).mockImplementationOnce(async()=>{vi.mocked(services.follows!.list).mockResolvedValue([]);return {...followed,following:false};});
 render(<MemoryRouter><FollowingPage /></MemoryRouter>);
 expect(await screen.findByRole('link',{name:'North Wolves'})).toHaveAttribute('href','/teams/north-wolves');
 fireEvent.click(screen.getByRole('button',{name:'İzləməni dayandır'}));
 expect(await screen.findByText('İzləmə dəyişdirilmədi')).toBeInTheDocument();
 expect(screen.getByRole('link',{name:'North Wolves'})).toBeInTheDocument();
 await waitFor(()=>expect(screen.getByRole('button',{name:'İzləməni dayandır'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'İzləməni dayandır'}));
 expect(await screen.findByText('İzlənən profil yoxdur')).toBeInTheDocument();
 expect(services.follows!.mutate).toHaveBeenLastCalledWith({entityType:'TEAM',entityId:'2',following:false});
});
