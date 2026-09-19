import type { RecordEntry, RecordType } from '../../src/types/domain';
import type { Repository } from './data';

/** Record holders and their captured tournament roster, derived from published results. */
export async function officialRecords(repo: Repository) {
 const [results, matches, teams, tournaments, registrations, rosters] = await Promise.all([
  repo.results(), repo.rows('matches'), repo.teams(), repo.tournaments(),
  repo.rows('tournament_registrations'), repo.rows('tournament_rosters'),
 ]);
 const categories: Array<{type: RecordType; label: string; unit: string; metric: 'finishes' | 'totalPoints'}> = [
  {type:'MOST_KILLS_ONE_MATCH',label:'Bir matçda ən çox kill',unit:'kill',metric:'finishes'},
  {type:'BEST_SINGLE_MATCH_POINTS',label:'Bir matçda ən yüksək xal',unit:'xal',metric:'totalPoints'},
 ];
 const all: RecordEntry[] = results.flatMap(result => {
  const match=matches.find(m=>m.id===result.roundId && m.published_at);
  const team=teams.find(t=>t.id===result.teamId && t.approvalStatus==='approved');
  const tournament=tournaments.find(t=>t.id===result.tournamentId);
  if(!match || !team || !tournament)return [];
  const registration=registrations.find(r=>r.team_id===team.id && r.tournament_id===tournament.id);
  const rosterSnapshot=rosters.filter(r=>r.registration_id===registration?.id).map(r=>({
   playerId:String(r.player_id),ign:String(r.ign),role:r.role as RecordEntry['rosterSnapshot'][number]['role'],
  }));
  return categories.map(category=>({
   id:`${category.type.toLowerCase()}-${result.id}`,type:category.type,label:category.label,
   value:result[category.metric],unit:category.unit,teamId:team.id,teamName:team.name,teamLogo:team.logoUrl,
   tournamentId:tournament.id,tournamentName:tournament.name,matchId:result.roundId,
   roundLabel:`${Number(match.day)}. gün · ${Number(match.round)}. raund`,map:String(match.map),
   achievedAt:String(match.scheduled_at),rosterSnapshot,rosterSnapshotStatus:rosterSnapshot.length?'available' as const:'unavailable' as const,
   source:'backend' as const,
  }));
 }).sort((a,b)=>a.achievedAt.localeCompare(b.achievedAt)||a.id.localeCompare(b.id));
 const progression: RecordEntry[]=[];
 for(const entry of all){const previous=progression.filter(r=>r.type===entry.type).at(-1);if(!previous || entry.value>previous.value)progression.push(entry);}
 return {current:categories.flatMap(c=>{const latest=progression.filter(r=>r.type===c.type).at(-1);return latest?[latest]:[];}),progression};
}
