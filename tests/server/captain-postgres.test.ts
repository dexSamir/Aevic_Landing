import {beforeEach, describe, expect, it, vi} from 'vitest';
import {PostgresCaptainStore} from '../../server/captain/postgres';
import postgres from 'postgres';
import {X509Certificate} from 'node:crypto';

const {query} = vi.hoisted(() => ({query: vi.fn()}));
vi.mock('postgres', () => ({default: vi.fn(() => query)}));

// Catalog fixtures only; this suite never connects to a database.
const columns = (dataType = 'bigint') => [
 {column_name:'id', data_type:dataType, column_default:null, is_identity:'NO'},
 ...['password_hash','reset_token'].map(column_name => ({column_name,
  data_type:'text', character_maximum_length:null, is_nullable:'YES'})),
];
const store = () => new PostgresCaptainStore('postgres://fixture@db.nmjjibifcuzjlsvfcaaz.supabase.co/postgres');

beforeEach(() => query.mockReset());
describe('existing bigint contract readiness', () => {
 it('verifies TLS using the Supabase CA without disabling certificate checks', () => {
  store();
  const options=vi.mocked(postgres).mock.calls.at(-1)![1];
  const ssl=options?.ssl as {rejectUnauthorized:boolean;ca:string};
  expect(ssl.rejectUnauthorized).toBe(true);
  const cert=new X509Certificate(ssl.ca);
  expect(cert.ca).toBe(true);
  expect(cert.subject).toContain('Supabase');
  expect(Date.parse(cert.validTo)).toBeGreaterThan(Date.now());
 });
 it('accepts bigint with no default/identity so trigger-generated IDs do not block auth', async () => {
  query.mockResolvedValueOnce(columns()).mockResolvedValueOnce([{rolsuper:false}]).mockResolvedValueOnce([]);
  await expect(store().ready()).resolves.toBeUndefined();
 });
 it('still rejects a different ID type', async () => {
  query.mockResolvedValueOnce(columns('uuid'));
  await expect(store().ready()).rejects.toMatchObject({code:'TEAM_ID_CONTRACT_UNAVAILABLE'});
 });
 it('still blocks exposed private data when the ID has no default', async () => {
  query.mockResolvedValueOnce(columns()).mockResolvedValueOnce([{rolsuper:false}]).mockResolvedValueOnce([{rolname:'anon'}]);
  await expect(store().ready()).rejects.toMatchObject({code:'AUTH_DATABASE_PERMISSIONS_UNSAFE'});
 });
 it('still rejects a superuser connection', async () => {
  query.mockResolvedValueOnce(columns()).mockResolvedValueOnce([{rolsuper:true}]);
  await expect(store().ready()).rejects.toMatchObject({code:'PRIVATE_DATABASE_ROLE_TOO_BROAD'});
 });
 it('shares concurrent catalog checks without caching a later permission decision', async () => {
  query.mockResolvedValueOnce(columns()).mockResolvedValueOnce([{rolsuper:false}]).mockResolvedValueOnce([]);
  const instance=store();
  await Promise.all([instance.ready(),instance.ready(),instance.ready()]);
  expect(query).toHaveBeenCalledTimes(3);
  query.mockResolvedValueOnce(columns()).mockResolvedValueOnce([{rolsuper:false}]).mockResolvedValueOnce([{rolname:'anon'}]);
  await expect(instance.ready()).rejects.toMatchObject({code:'AUTH_DATABASE_PERMISSIONS_UNSAFE'});
  expect(query).toHaveBeenCalledTimes(6);
 });
});
