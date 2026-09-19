import type { DbClient } from '../db';
import { dbError,ServiceError } from '../errors';
import type { Team, Tournament, TeamTournamentResult, MatchHistoryEntry, MatchScheduleItem, PublicTeamSummary, PublicTeamProfile, TeamPlatformSnapshot, Notification, AdminMessage, ResultDispute, RosterChangeRequest, RoundResult } from '../../src/types/domain';
import { summarizeMapPerformance, deriveTeamForm } from '../../src/utils/competitionAnalytics';

import { achievements } from './identity';

type Row = Record<string, unknown>;
// Column grants intentionally exclude review notes, even for public rows.
const projections: Record<string, string> = {
 teams: 'id,name,slug,tag,logo_url,banner_url,banner_alt,description,country,founded_at,game_key,approval_status,verification_level,archived_at,created_at,updated_at',
 tournament_registrations: 'id,tournament_id,team_id,status,slot_number,roster_lock_at,created_at,updated_at',
};
const s=(r:Row,k:string)=>String(r[k]??'');
const n=(r:Row,k:string)=>Number(r[k]??0);
const opt=(r:Row,k:string)=>r[k]==null?undefined:String(r[k]);
export class Repository {
 private loaded = new Map<string,Promise<Row[]>>();
 private capacity?: Promise<Array<{tournament_id:string;used_slots:number}>>;
 private reasons?: Promise<Array<{team_id:string;reason:string|null}>>;
 private tournamentCapacity() {
  return this.capacity ??= (async()=>{const {data,error}=await this.db.rpc('tournament_capacity');dbError(error);return data as Array<{tournament_id:string;used_slots:number}>;})();
 }
 private teamReasons() {
  return this.reasons ??= (async()=>{const {data,error}=await this.db.rpc('team_review_reasons');dbError(error);return data as Array<{team_id:string;reason:string|null}>;})();
 }
 constructor(readonly db:DbClient) {}
 async rows(table:string):Promise<Row[]> {
  if(!this.loaded.has(table)) this.loaded.set(table,(async()=>{
   const rows:Row[]=[];let offset=0;
   // Stable primary-key ordering avoids silent Supabase 1000-row truncation.
   const order=({team_social_links:'team_id',player_identities:'player_id',tournament_rosters:'registration_id',check_ins:'tournament_id',notification_preferences:'user_id',admin_roles:'user_id',follows:'user_id',organization_teams:'organization_id',featured_achievements:'team_id'} as Record<string,string>)[table]??'id';
   for(;;){ let query=this.db.from(table).select(projections[table] ?? '*').order(order); const secondary=({tournament_rosters:'player_id',check_ins:'team_id',follows:'team_id',organization_teams:'team_id',featured_achievements:'position',team_social_links:'platform'} as Record<string,string>)[table];if(secondary)query=query.order(secondary);const {data,error}=await query.range(offset,offset+999);dbError(error); const page=data as unknown as Row[]; rows.push(...page);if(page.length<1000)break;offset+=1000;if(offset>=100000)throw new ServiceError(503,'DATASET_TOO_LARGE'); }
   return rows;
  })());
  return this.loaded.get(table)!;
 }
 async tournaments():Promise<Tournament[]> {
  const [rows,entries]=await Promise.all([this.rows('tournaments'),this.rows('tournament_registrations')]);
  const counts=await this.tournamentCapacity();
  return rows.map(r=>({id:s(r,'id'),name:s(r,'name'),shortName:s(r,'short_name'),description:s(r,'description'),status:s(r,'status') as Tournament['status'],startsAt:s(r,'starts_at'),endsAt:s(r,'ends_at'),registrationOpensAt:s(r,'registration_opens_at'),registrationDeadline:s(r,'registration_deadline'),checkInOpensAt:s(r,'check_in_opens_at'),checkInClosesAt:s(r,'check_in_closes_at'),maxSlots:n(r,'max_slots'),usedSlots:counts.find(c=>c.tournament_id===r.id)?.used_slots??entries.filter(e=>e.tournament_id===r.id&&['pending','confirmed'].includes(s(e,'status'))).length,days:n(r,'days'),roundsPerDay:n(r,'rounds_per_day'),mapRotation:{id:s(r,'id'),maps:r.map_rotation as string[]},pointFormula:r.point_formula as Tournament['pointFormula'],rules:r.rules as string[],featured:Boolean(r.featured),prizePool:0,prizeCurrency:'',prizeDistribution:[],disputeDurationMinutes:n(r,'dispute_duration_minutes')}));
 }
 async teams(privateData=false):Promise<Team[]> {
  const [teams,roster,players,social,identities,links]=await Promise.all([this.rows('teams'),this.rows('team_players'),this.rows('players'),this.rows('team_social_links'),privateData?this.rows('player_identities'):Promise.resolve([]),this.rows('organization_teams')]);
  const reasons: Array<{team_id:string;reason:string|null}> = [];
  if(privateData)reasons.push(...await this.teamReasons());
  return teams.map(r=>({id:s(r,'id'),name:s(r,'name'),slug:s(r,'slug'),tag:opt(r,'tag'),description:s(r,'description'),logoUrl:opt(r,'logo_url'),bannerUrl:opt(r,'banner_url'),bannerAlt:opt(r,'banner_alt'),country:opt(r,'country'),gameKey:s(r,'game_key'),foundedAt:opt(r,'founded_at'),approvalStatus:s(r,'approval_status') as Team['approvalStatus'],registeredAt:s(r,'created_at'),verificationLevel:s(r,'verification_level') as Team['verificationLevel'],organizationRelationship:links.some(l=>l.team_id===r.id)?'owned':'independent',organizationId:opt(links.find(l=>l.team_id===r.id)??{},'organization_id'),socialLinks:Object.fromEntries(social.filter(v=>v.team_id===r.id).map(v=>[s(v,'platform'),s(v,'url')])),rejectionReason:reasons.find(n=>n.team_id===r.id)?.reason??undefined,profileComplete:roster.filter(v=>v.team_id===r.id).length===5,
  captain:{id:'',firstName:'',lastName:'',email:'',role:'captain'}, // Public identity deliberately excludes account/contact fields.
  roster:roster.filter(v=>v.team_id===r.id).map(v=>({id:s(v,'player_id'),ign:s(players.find(p=>p.id===v.player_id)??{},'ign'),role:s(v,'role') as Team['roster'][number]['role'],joinedAt:s(v,'created_at'),...(privateData?{uid:opt(identities.find(i=>i.player_id===v.player_id)??{},'pubg_id')}:{})}))}));
 }
 async team(idOrSlug:string,privateData=false) { const team=(await this.teams(privateData)).find(t=>t.id===idOrSlug||t.slug===idOrSlug);if(!team)throw new ServiceError(404,'TEAM_NOT_FOUND');return team; }
 async tournament(id:string) {const t=(await this.tournaments()).find(t=>t.id===id);if(!t)throw new ServiceError(404,'TOURNAMENT_NOT_FOUND');return t;}
 async schedule():Promise<MatchScheduleItem[]> {return (await this.rows('matches')).map(m=>({id:s(m,'id'),tournamentId:s(m,'tournament_id'),stage:s(m,'stage') as MatchScheduleItem['stage'],day:n(m,'day'),round:n(m,'round'),map:s(m,'map'),lobby:s(m,'lobby'),startsAt:s(m,'scheduled_at'),status:s(m,'status') as MatchScheduleItem['status']})).sort((a,b)=>a.startsAt.localeCompare(b.startsAt));}
 async results():Promise<RoundResult[]> {return(await this.rows('team_match_results')).filter(r=>r.published).map(roundResult);}
 async standings(tournamentId?:string):Promise<TeamTournamentResult[]> {
  const results=(await this.results()).filter(r=>!tournamentId||r.tournamentId===tournamentId);const grouped=new Map<string,TeamTournamentResult>();
  for(const r of results){const key=r.tournamentId+':'+r.teamId;const v=grouped.get(key)??{tournamentId:r.tournamentId,teamId:r.teamId,placement:0,matches:0,wwcd:0,finishes:0,placementPoints:0,finishPoints:0,penalties:0,totalPoints:0,bestFinish:100};v.matches++;v.wwcd+=Number(r.placement===1);v.finishes+=r.finishes;v.placementPoints+=r.placementPoints;v.finishPoints+=r.finishPoints;v.penalties+=r.penalties;v.totalPoints+=r.totalPoints;v.bestFinish=Math.min(v.bestFinish,r.placement);grouped.set(key,v);}
  const all=[...grouped.values()]; const tournaments=new Set(all.map(r=>r.tournamentId));
  return [...tournaments].flatMap(id=>all.filter(r=>r.tournamentId===id).sort((a,b)=>b.totalPoints-a.totalPoints||b.wwcd-a.wwcd||b.finishes-a.finishes||a.bestFinish-b.bestFinish||a.teamId.localeCompare(b.teamId)).map((r,i)=>({...r,placement:i+1})));
 }
 async history(teamId?:string):Promise<MatchHistoryEntry[]> {
  const [results,matches,tournaments]=await Promise.all([this.results(),this.rows('matches'),this.tournaments()]);
  return results.filter(r=>!teamId||r.teamId===teamId).flatMap(r=>{const m=matches.find(m=>m.id===r.roundId);if(!m?.published_at)return[];return[{id:r.roundId,tournamentId:r.tournamentId,tournamentName:tournaments.find(t=>t.id===r.tournamentId)?.name??'',playedAt:s(m,'scheduled_at'),publishedAt:s(m,'published_at'),disputeDeadlineAt:opt(m,'dispute_deadline_at'),stage:s(m,'stage') as MatchHistoryEntry['stage'],stageLabel:`${n(m,'day')}. gün · ${n(m,'round')}. raund`,map:s(m,'map'),placement:r.placement,finishes:r.finishes,placementPoints:r.placementPoints,killPoints:r.finishPoints,points:r.totalPoints,wwcd:r.placement===1}];}).sort((a,b)=>b.playedAt.localeCompare(a.playedAt));
 }
 async profile(slug:string):Promise<PublicTeamProfile> {
  const team=await this.team(slug);if(team.approvalStatus!=='approved')throw new ServiceError(404,'TEAM_NOT_FOUND');
  const [history,standings,schedule,registrations]=await Promise.all([this.history(team.id),this.standings(),this.schedule(),this.rows('tournament_registrations')]);
  const recentResults=standings.filter(r=>r.teamId===team.id);const badges=await achievements(this,team.id);const career=deriveCareerSummary(team.id,history);
  const legacy={foundedAt:team.foundedAt??team.registeredAt,tournaments:new Set(history.map(m=>m.tournamentId)).size,wins:history.filter(m=>m.wwcd).length,topPlacements:history.filter(m=>m.placement<=3).length,finishes:history.reduce((sum,m)=>sum+m.finishes,0),unlockedAchievements:badges.filter(a=>a.state==='unlocked').length};
  return{team,achievements:badges,featuredAchievementIds:badges.filter(a=>a.featured).map(a=>a.id),legacy,recentResults,career,recentMatches:history,upcomingMatch:schedule.find(m=>m.status!=='completed'&&registrations.some(r=>r.team_id===team.id&&r.tournament_id===m.tournamentId&&r.status==='confirmed')),form:deriveTeamForm(history),mapSpecialization:summarizeMapPerformance(team.id,history)};
 }
 async notifications():Promise<Notification[]> {return(await this.rows('notifications')).map(notification).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
 async messages():Promise<AdminMessage[]> {return(await this.rows('messages')).map(r=>({...notification(r),audience:r.team_id?'team' as const:'all' as const})).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
 async disputes():Promise<ResultDispute[]> {
  const [rows,teams,tournaments,matches,media]=await Promise.all([this.rows('disputes'),this.teams(),this.tournaments(),this.rows('matches'),this.rows('media')]);
  return rows.map(r=>({id:s(r,'id'),teamId:s(r,'team_id'),teamName:teams.find(t=>t.id===r.team_id)?.name??'',tournamentId:s(r,'tournament_id'),tournamentName:tournaments.find(t=>t.id===r.tournament_id)?.name??'',matchId:s(r,'match_id'),roundLabel:`${n(matches.find(m=>m.id===r.match_id)??{},'round')}. raund`,issueType:s(r,'issue_type') as ResultDispute['issueType'],description:s(r,'description'),evidenceNames:media.filter(m=>m.dispute_id===r.id).map(m=>s(m,'file_name')),evidenceIds:media.filter(m=>m.dispute_id===r.id).map(m=>s(m,'id')),status:s(r,'status') as ResultDispute['status'],submittedAt:s(r,'created_at'),deadlineAt:s(r,'deadline_at'),adminNote:opt(r,'admin_note'),resolvedAt:opt(r,'resolved_at')}));
 }
 async rosterRequests():Promise<RosterChangeRequest[]> {
  const [rows,teams,tournaments,players]=await Promise.all([this.rows('roster_change_requests'),this.teams(),this.tournaments(),this.rows('players')]);
  return rows.map(r=>({id:s(r,'id'),teamId:s(r,'team_id'),teamName:teams.find(t=>t.id===r.team_id)?.name??'',tournamentId:opt(r,'tournament_id'),tournamentName:tournaments.find(t=>t.id===r.tournament_id)?.name,outgoing:{id:s(r,'outgoing_player_id'),ign:s(players.find(p=>p.id===r.outgoing_player_id)??{},'ign'),role:s(r,'incoming_role') as RosterChangeRequest['outgoing']['role']},incoming:{ign:s(r,'incoming_ign'),uid:s(r,'incoming_pubg_id'),role:s(r,'incoming_role') as RosterChangeRequest['incoming']['role']},reason:s(r,'reason'),status:s(r,'status') as RosterChangeRequest['status'],submittedAt:s(r,'created_at'),updatedAt:s(r,'updated_at'),adminNote:opt(r,'admin_note')}));
 }
 async teamSnapshot(teamId:string):Promise<TeamPlatformSnapshot> {
  const [team,tournaments,registrations,checkins,schedule,history,leaderboard,notifications,messages,teams,matches]=await Promise.all([this.team(teamId,true),this.tournaments(),this.rows('tournament_registrations'),this.rows('check_ins'),this.schedule(),this.history(teamId),this.standings(),this.notifications(),this.messages(),this.teams(),this.rows('matches')]);
  const badges=await achievements(this,teamId);
  const participations=registrations.filter(r=>r.team_id===teamId).map(r=>({id:s(r,'id'),teamId,tournamentId:s(r,'tournament_id'),status:s(r,'status') as TeamPlatformSnapshot['participations'][number]['status'],createdAt:s(r,'created_at'),slotNumber:r.slot_number?Number(r.slot_number):undefined,rosterLockAt:s(r,'roster_lock_at')}));
  const relevant=tournaments.filter(t=>participations.some(p=>p.tournamentId===t.id&&p.status==='confirmed')).sort((a,b)=>a.startsAt.localeCompare(b.startsAt));
  const active=relevant.find(t=>!['completed','cancelled'].includes(t.status));const check=active?checkins.find(r=>r.team_id===teamId&&r.tournament_id===active.id):undefined;
  const next=matches.filter(m=>m.status!=='completed'&&participations.some(p=>p.tournamentId===m.tournament_id&&p.status==='confirmed')).sort((a,b)=>s(a,'scheduled_at').localeCompare(s(b,'scheduled_at')))[0];
  return{currentTeam:team,publicTeams:teams.filter(t=>t.approvalStatus==='approved').map(summary),tournaments,participations,checkIn:active?{tournamentId:active.id,teamId,status:check?'checked-in':Date.now()<Date.parse(active.checkInOpensAt)?'pending':Date.now()>=Date.parse(active.checkInClosesAt)?'missed':'open',opensAt:active.checkInOpensAt,closesAt:active.checkInClosesAt,checkedInAt:check?s(check,'checked_in_at'):undefined}:undefined,currentRoom:next?{roundId:s(next,'id'),releaseAt:s(next,'room_release_at'),status:Date.now()>=Date.parse(s(next,'room_release_at'))?'released':'locked'}:undefined,leaderboard,leaderboardTeams:teams.map(t=>t.name),matchHistory:history,matchSchedule:schedule.filter(m=>participations.some(p=>p.tournamentId===m.tournamentId&&p.status==='confirmed')),notifications,adminMessages:messages,teamAnnouncements:messages.map(m=>({id:m.id,title:m.title,body:m.body,createdAt:m.createdAt,kind:m.severity==='critical'?'important':'info',dismissible:false,actionHref:m.actionHref})),teamAchievements:badges,teamLegacyStats:{foundedAt:team.foundedAt??team.registeredAt,tournaments:new Set(history.map(m=>m.tournamentId)).size,wins:history.filter(m=>m.wwcd).length,topPlacements:history.filter(m=>m.placement<=3).length,finishes:history.reduce((sum,m)=>sum+m.finishes,0),unlockedAchievements:badges.filter(a=>a.state==='unlocked').length},careerSummary:deriveCareerSummary(teamId,history),teamComparisonRecords:[]};
 }
}
export const summary=(t:Team):PublicTeamSummary=>({id:t.id,slug:t.slug??t.id,name:t.name,tag:t.tag,logoUrl:t.logoUrl,country:t.country,verificationLevel:t.verificationLevel,rosterSize:t.roster.length,gameKey:t.gameKey});
export const roundResult=(r:Row):RoundResult=>({id:s(r,'id'),roundId:s(r,'match_id'),tournamentId:s(r,'tournament_id'),teamId:s(r,'team_id'),placement:n(r,'placement'),finishes:n(r,'finishes'),placementPoints:n(r,'placement_points'),finishPoints:n(r,'finish_points'),penalties:n(r,'penalties'),totalPoints:n(r,'total_points'),published:Boolean(r.published),notes:opt(r,'notes')});
export const notification=(r:Row):Notification=>({id:s(r,'id'),title:s(r,'title'),body:s(r,'body'),severity:s(r,'severity') as Notification['severity'],createdAt:s(r,'created_at'),read:Boolean(r.read_at),actionHref:opt(r,'action_href'),eventType:(s(r,'event_type')||'admin-message') as Notification['eventType']});

function deriveCareerSummary(teamId:string,matches:MatchHistoryEntry[]):import('../../src/types/domain').CareerSummaryData {
 return {teamId,scopeLabel:'Rəsmi nəticələr',metrics:[
 {key:'matches',label:'Matç',value:matches.length,description:'Dərc edilmiş matçlar'},
 {key:'finishes',label:'Kill',value:matches.reduce((s,m)=>s+m.finishes,0),description:'Rəsmi kill sayı'},
 {key:'wwcd',label:'WWCD',value:matches.filter(m=>m.wwcd).length,description:'Birinci yerlər'},
 {key:'podiums',label:'Podium',value:matches.filter(m=>m.placement<=3).length,description:'İlk üçlük'}]};
}
