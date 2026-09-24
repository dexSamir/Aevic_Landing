import {render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {beforeEach,it,expect,vi} from 'vitest';
import {ResetPasswordPage} from '../src/pages/AuthLifecyclePages';
import {RegisterPage} from '../src/pages/AuthPages';
import {services} from '../src/services';
beforeEach(()=>{sessionStorage.clear();localStorage.clear();window.history.replaceState(null,'','/');});
it('keeps reset link only in memory and removes it from the address bar',async()=>{
 const raw='2.'+'x'.repeat(43);window.history.replaceState(null,'',`/reset-password#token=${raw}`);
 const inspect=vi.spyOn(services.auth,'inspectPasswordReset').mockResolvedValue({state:'valid'});
 render(<MemoryRouter><ResetPasswordPage /></MemoryRouter>);
 await screen.findByLabelText('Yeni şifrə');expect(inspect).toHaveBeenCalledWith(raw);expect(window.location.hash).toBe('');expect(sessionStorage.length).toBe(0);expect(localStorage.length).toBe(0);
});
it('does not unlock password submission when token verification fails',async()=>{
 vi.spyOn(services.auth,'inspectPasswordReset').mockRejectedValue(new Error('offline'));
 render(<MemoryRouter><ResetPasswordPage /></MemoryRouter>);
 await screen.findByText('Bərpa xidməti əlçatan deyil');expect(screen.queryByLabelText('Yeni şifrə')).not.toBeInTheDocument();
});
it('keeps registration available but disables unsupported tag persistence',async()=>{
 vi.spyOn(services.registration,'checkTeamName').mockResolvedValue({available:true,normalizedName:'Test',scope:'platform',source:'backend'});
 render(<MemoryRouter><RegisterPage /></MemoryRouter>);
 await waitFor(()=>expect(screen.getByLabelText(/Qısa tag/)).toBeDisabled());expect(screen.getByLabelText('Komanda adı')).toBeEnabled();expect(screen.getByText('Teq saxlanması hazırda dəstəklənmir.')).toBeInTheDocument();
});
