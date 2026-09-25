import type {TransactionSql} from 'postgres';
import {rankResults,roundResult} from '../services/data';
export async function captureStandings(tx:TransactionSql,tournamentId:string,matchId:string,reason:'publication'|'correction'){
 const results=await tx`select r.*,r.team_id::text from aevic_platform.team_match_results r join aevic.matches m on m.id=r.match_id where r.tournament_id=${tournamentId} and r.published and m.published_at is not null`;
 const standings=rankResults(results.map(roundResult)).map(r=>({teamId:r.teamId,rank:r.placement,totalPoints:r.totalPoints}));
 await tx`insert into aevic_platform.leaderboard_snapshots(tournament_id,match_id,reason,standings) values(${tournamentId},${matchId},${reason},${tx.json(standings)})`;
}
