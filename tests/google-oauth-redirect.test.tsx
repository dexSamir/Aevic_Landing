import {expect,it} from 'vitest';
import {googleOAuthRedirect} from '../src/utils/googleOAuthRedirect';
const base='https://nmjjibifcuzjlsvfcaaz.supabase.co/auth/v1/authorize';
it('accepts both supported providers without changing state, PKCE or callback parameters',()=>{
 for(const url of ['https://accounts.google.com/o/oauth2/v2/auth?state=abc&code_challenge=challenge',base+'?provider=google&redirect_to=https%3A%2F%2Faevic-esports.netlify.app%2Fapi%2Fauth%2Fgoogle%2Fcallback%3Fstate%3Dabc&code_challenge=challenge&code_challenge_method=s256'])expect(googleOAuthRedirect(url)).toBe(url);
});
it('rejects other tenants, origins, paths, providers, credentials and unsafe schemes',()=>{
 for(const url of ['https://attacker.invalid/',base.replace('nmjjibifcuzjlsvfcaaz','other')+'?provider=google',base+'?provider=github',base+'?provider=google&provider=github',base.replace('/authorize','/logout')+'?provider=google',base.replace('https:','http:')+'?provider=google',base.replace('https://','https://user:password@')+'?provider=google','javascript:alert(1)',base+'?provider=google#x','//accounts.google.com/o/oauth2/v2/auth',undefined])expect(()=>googleOAuthRedirect(url)).toThrow();
});
