import {afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {GoogleAuth} from '../src/components/auth/GoogleAuth';
import {ApiError} from '../src/services/apiError';
const {request}=vi.hoisted(()=>({request:vi.fn()}));
vi.mock('../src/services/tokenSession',()=>({sessionTransport:()=>({request})}));
afterEach(()=>{window.history.replaceState({},'','/');request.mockReset();});
it('does not advertise an unconfigured Google provider',async()=>{
 request.mockResolvedValue({enabled:false});const {container}=render(<GoogleAuth/>);await waitFor(()=>expect(request).toHaveBeenCalledWith('/auth/google/status'));expect(container.textContent).toBe('');
});
it('requires explicit password proof for linking and exposes MFA when required',async()=>{
 window.history.replaceState({},'','/login?google=continue');
 request.mockImplementation((path:string)=>path.endsWith('/status')?Promise.resolve({enabled:true}):path.endsWith('/continuation')?Promise.resolve({email:'captain@example.com',mode:'link'}):Promise.reject(new ApiError({status:401,code:'MFA_REQUIRED'})));
 render(<GoogleAuth/>);
 const button=await screen.findByRole('button',{name:'Hesabı əlaqələndir və daxil ol'});expect(button).toBeDisabled();
 fireEvent.change(screen.getByLabelText('Mövcud AEVIC şifrəsi'),{target:{value:'Password1'}});fireEvent.click(button);
 expect(await screen.findByLabelText('Doğrulama və ya bərpa kodu')).toBeInTheDocument();
 const call=request.mock.calls.find(([path])=>path==='/auth/google/complete')!;expect(JSON.parse(call[1].body)).toEqual({password:'Password1'});
});
it('a linked identity does not ask for a password again',async()=>{
 window.history.replaceState({},'','/login?google=continue');request.mockImplementation((path:string)=>Promise.resolve(path.endsWith('/status')?{enabled:true}:{email:'captain@example.com',mode:'login'}));
 render(<GoogleAuth/>);expect(await screen.findByRole('button',{name:'Girişi tamamla'})).toBeEnabled();expect(screen.queryByLabelText('Mövcud AEVIC şifrəsi')).toBeNull();
});
