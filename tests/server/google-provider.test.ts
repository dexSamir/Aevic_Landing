import {describe,it,expect} from 'vitest';
import {generateKeyPairSync,sign} from 'node:crypto';
import {validateGoogleToken,pkceChallenge} from '../../server/auth/google-provider';
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const key={...publicKey.export({format:'jwk'}),kid:'fixture',alg:'RS256',use:'sig'};
const now=Date.now(),claims={iss:'https://accounts.google.com',aud:'client',sub:'stable-subject',email:'Captain@example.com',email_verified:true,nonce:'nonce',iat:Math.floor(now/1000),exp:Math.floor(now/1000)+3600};
function token(patch:Record<string,unknown>={},header:Record<string,unknown>={}){const data=[{alg:'RS256',kid:'fixture',...header},{...claims,...patch}].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.');return data+'.'+sign('RSA-SHA256',Buffer.from(data),privateKey).toString('base64url');}
describe('Google identity boundary',()=>{
 it('validates signature and normalizes only the verified email',()=>expect(validateGoogleToken(token(),'client','nonce',[key],now)).toMatchObject({subject:'stable-subject',email:'captain@example.com'}));
 for(const patch of [{iss:'https://attacker.test'},{aud:'other'},{azp:'other'},{nonce:'other'},{email_verified:false},{email_verified:'true'},{exp:0},{iat:Math.floor(now/1000)+500},{sub:''},{email:'invalid'}])it(`rejects ${JSON.stringify(patch)}`,()=>expect(()=>validateGoogleToken(token(patch),'client','nonce',[key],now)).toThrow());
 it('rejects unsigned, wrong-key and tampered tokens',()=>{
  expect(()=>validateGoogleToken(token({}, {alg:'none'}),'client','nonce',[key],now)).toThrow();
  expect(()=>validateGoogleToken(token(),'client','nonce',[],now)).toThrow();
  const original=token().split('.');original[1]=Buffer.from(JSON.stringify({...claims,sub:'changed'})).toString('base64url');expect(()=>validateGoogleToken(original.join('.'),'client','nonce',[key],now)).toThrow();
 });
 it('uses the RFC 7636 S256 test vector',()=>expect(pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'));
});
