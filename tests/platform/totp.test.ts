import {describe,it,expect} from 'vitest';
import {totp,base32,fromBase32,acceptedStep,sealSecret,openSecret,generateRecovery,recoveryDigest} from '../../server/platform/totp';
const secret=Buffer.from('12345678901234567890'),master='isolated-mfa-master-key-at-least-32-characters';
describe('TOTP and protected secrets',()=>{
 it('matches the RFC 6238 SHA-1 reference vectors, including post-2038 times',()=>{
  for(const [seconds,expected]of [[59,'94287082'],[1111111109,'07081804'],[1111111111,'14050471'],[1234567890,'89005924'],[2000000000,'69279037'],[20000000000,'65353130']] as const)expect(totp(secret,Math.floor(seconds/30),8)).toBe(expected);
 });
 it('accepts only a bounded clock window and rejects already-used time steps',()=>{
  const now=1234567890000,step=Math.floor(now/30000),code=totp(secret,step);
  expect(acceptedStep(secret,code,-1,now)).toBe(step);expect(acceptedStep(secret,code,step,now)).toBeUndefined();
  expect(acceptedStep(secret,totp(secret,step-2),-1,now)).toBeUndefined();expect(acceptedStep(secret,'not-a-code',-1,now)).toBeUndefined();
 });
 it('round trips authenticator base32 provisioning without exposing stored plaintext',()=>{
  expect(fromBase32(base32(secret))).toEqual(secret);const sealed=sealSecret(secret,master,'team:1');expect(sealed).not.toContain(secret.toString());expect(openSecret(sealed,master,'team:1')).toEqual(secret);
  expect(()=>openSecret(sealed,master,'team:2')).toThrow();expect(()=>openSecret(sealed,master+'changed','team:1')).toThrow();
  const fields=sealed.split('.');fields[2]=(fields[2][0]==='A'?'B':'A')+fields[2].slice(1);expect(()=>openSecret(fields.join('.'),master,'team:1')).toThrow();
 });
 it('generates account-bound recovery digests and normalizes printed formatting',()=>{
  const result=generateRecovery(master,'team:1');expect(new Set(result.codes).size).toBe(10);expect(new Set(result.digests).size).toBe(10);
  expect(recoveryDigest(result.codes[0].toLowerCase().replaceAll('-',' '),master,'team:1')).toBe(result.digests[0]);expect(recoveryDigest(result.codes[0],master,'team:2')).not.toBe(result.digests[0]);
 });
});
