import type {Sql} from 'postgres';
import type {Actor} from './repository';
import {ServiceError} from '../errors';
export const managingRoles=['OWNER','CAPTAIN','MANAGER','CO_CAPTAIN'];
// Account and authentication endpoints deliberately retain the authenticated account.
// Only these team workflows use a selected workspace.
export function workspaceRequest(path:string){
 path=path.replace(/^\/api/,'');
 return /^\/(teams\/|team\/|roster-requests(?:\/|$)|disputes(?:\/|$))/.test(path)
  ||/^\/tournaments\/[^/]+\/(entries|check-in|withdraw)$/.test(path)
  ||/^\/me\/(context|team|legacy-roster|messages|notifications|notification-preferences)(\/|$)/.test(path)
  ||/^\/media(?:\/|$)/.test(path)
  ||/^\/verifications(?:\/|$)/.test(path);
}
export async function selectWorkspace(sql:Sql,identity:Actor,selected?:string){
 const account=identity.accountId??identity.teamId;if(!account)return;
 const rows=await sql`select a.team_id::text,a.role from aevic_platform.team_authority a left join aevic_platform.team_details d on d.team_id=a.team_id where a.account_id=${account} and d.archived_at is null order by (a.team_id=${account}) desc,a.created_at,a.team_id`;
 const row=rows.find(r=>r.team_id===selected)??rows[0];
 identity.teamId=row?.team_id;identity.teamRole=row?.role;
}
export function requireWorkspaceWrite(identity:Actor){if(!identity.teamId||!managingRoles.includes(identity.teamRole??''))throw new ServiceError(403,'TEAM_MANAGEMENT_REQUIRED');}
