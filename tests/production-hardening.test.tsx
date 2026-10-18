import { PublicSessionProvider } from '../src/services/PublicSessionContext';
import { act, fireEvent, render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublicHeader } from '../src/layouts/layouts';
import { ProtectedRoute } from '../src/layouts/ProtectedRoute';
import { createServiceCapabilities } from '../src/services/capabilities';
import { services, serviceCapabilities } from '../src/services';
import { clearQueryCache } from '../src/services/queryCache';
import { ApiError } from '../src/services/apiError';

vi.mock('../src/services', async (original) => {
 const actual = await original<typeof import('../src/services')>();
 return { ...actual, serviceCapabilities: { ...actual.serviceCapabilities } };
});
afterEach(() => { cleanup(); clearQueryCache('all'); vi.useRealTimers(); Object.assign(serviceCapabilities, createServiceCapabilities('mock')); vi.restoreAllMocks(); });
const session = {user: {id:'test-user', firstName:'Owner', lastName:'Test', email:'owner@example.test', role:'visitor' as const}, role:'visitor' as const};

describe('production account recovery', () => {
 it('keeps a failed logout visible and offers a retry without an unhandled rejection', async () => {
  vi.spyOn(services.auth,'getSession').mockResolvedValue(session);
  const logout=vi.spyOn(services.auth,'logout').mockRejectedValue(new ApiError({status:503,kind:'server'}));
  render(<MemoryRouter><PublicSessionProvider><PublicHeader /></PublicSessionProvider></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button',{name:'Owner hesab menyusu'}));
  expect(screen.getByRole('menuitem',{name:'Ayarlar'})).toHaveAttribute('href','/account/security');
  fireEvent.click(screen.getByRole('menuitem',{name:'Çıxış'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Çıxış tamamlanmadı');
  expect(screen.getByRole('menuitem',{name:'Çıxış'})).toBeEnabled();
  expect(logout).toHaveBeenCalledTimes(1);
 });
 it('retries an unavailable session check on the current route and restores protected content',async()=>{
  Object.assign(serviceCapabilities,createServiceCapabilities('api'));
  const getSession=vi.spyOn(services.auth,'getSession').mockRejectedValueOnce(new ApiError({status:503,kind:'server'})).mockResolvedValue(session);
  render(<MemoryRouter initialEntries={['/account/profile']}><ProtectedRoute area="account"><h1>Private account</h1></ProtectedRoute></MemoryRouter>);
  expect(await screen.findByRole('heading',{name:'Private account'})).toBeInTheDocument();
  expect(getSession).toHaveBeenCalledTimes(2);
 });
});

function teamGuard() {
 return render(<MemoryRouter initialEntries={['/team']}><Routes>
  <Route path="/team" element={<ProtectedRoute area="team"><h1>Team panel</h1></ProtectedRoute>} />
  <Route path="/login" element={<h1>Login required</h1>} />
  <Route path="/forbidden" element={<h1>Forbidden</h1>} />
 </Routes></MemoryRouter>);
}
it.each([401,403])('distinguishes terminal session status %i',async status=>{
 vi.spyOn(services.auth,'getSession').mockRejectedValue(new ApiError({status,kind:status===401?'unauthorized':'forbidden'}));
 teamGuard();expect(await screen.findByRole('heading',{name:status===401?'Login required':'Forbidden'})).toBeInTheDocument();
});
it('denies a valid account without a team role',async()=>{
 vi.spyOn(services.auth,'getSession').mockResolvedValue(session);
 teamGuard();expect(await screen.findByRole('heading',{name:'Forbidden'})).toBeInTheDocument();
});
it('reuses a recent private session on rapid navigation and invalidates it on identity change',async()=>{
 const read=vi.spyOn(services.auth,'getSession').mockResolvedValue({...session,role:'captain'});
 const first=teamGuard();await screen.findByRole('heading',{name:'Team panel'});first.unmount();
 teamGuard();await screen.findByRole('heading',{name:'Team panel'});expect(read).toHaveBeenCalledTimes(1);
 read.mockResolvedValue(null);
 act(()=>window.dispatchEvent(new Event('aevic:session-change')));
 expect(await screen.findByRole('heading',{name:'Login required'})).toBeInTheDocument();
});
it.each(['server','network','timeout'] as const)('keeps a persistent %s outage recoverable without logging out',async kind=>{
 vi.useFakeTimers();
 const read=vi.spyOn(services.auth,'getSession').mockRejectedValue(new ApiError({status:kind==='server'?503:0,kind,retryAfterMs:kind==='server'?3000:undefined}));
 teamGuard();await act(async()=>{await vi.advanceTimersByTimeAsync(8000);});
 expect(screen.getByRole('heading',{name:'Bağlantını yoxlayın'})).toBeInTheDocument();
 expect(screen.queryByRole('heading',{name:'Login required'})).not.toBeInTheDocument();expect(read).toHaveBeenCalledTimes(3);
 read.mockResolvedValue({...session,role:'captain'});
 await act(async()=>{await vi.advanceTimersByTimeAsync(3000);});
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Yenidən yoxla'})));
 expect(screen.getByRole('heading',{name:'Team panel'})).toBeInTheDocument();
});

it('respects rate-limit cooldowns without redirecting or retrying early',async()=>{
 vi.useFakeTimers();
 const read=vi.spyOn(services.auth,'getSession').mockRejectedValueOnce(new ApiError({status:429,kind:'rate-limit',retryAfterMs:30000})).mockResolvedValue({...session,role:'captain'});
 teamGuard();await act(async()=>{});
 expect(screen.getByRole('heading',{name:'Bağlantını yoxlayın'})).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'30 san. sonra yoxla'})).toBeDisabled();
 await act(async()=>{await vi.advanceTimersByTimeAsync(30000);});
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Yenidən yoxla'})));
 expect(read).toHaveBeenCalledTimes(2);expect(screen.getByRole('heading',{name:'Team panel'})).toBeInTheDocument();
});
