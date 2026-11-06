// Synthetic HTTP-boundary fixture only. Never import this module into application code.
import type { AdminAnalytics, AnalyticsRange, AnalyticsPoint } from '../../src/types/adminAnalytics';
import { tournaments } from './platform-data';
const events = [
 {date:'2026-09-20',tournaments:1,completions:0,teams:4,registrations:3,publishedRounds:0,publishedResults:0},
 {date:'2026-10-15',tournaments:1,completions:0,teams:2,registrations:4,publishedRounds:0,publishedResults:0},
 {date:'2026-10-31',tournaments:1,completions:0,teams:1,registrations:3,publishedRounds:0,publishedResults:0},
 {date:'2026-11-01',tournaments:0,completions:0,teams:2,registrations:5,publishedRounds:0,publishedResults:0},
 {date:'2026-11-03',tournaments:0,completions:1,teams:0,registrations:0,publishedRounds:4,publishedResults:20},
 {date:'2026-11-05',tournaments:0,completions:0,teams:1,registrations:2,publishedRounds:2,publishedResults:10},
] satisfies AnalyticsPoint[];
export function adminAnalyticsFixture(range: AnalyticsRange='30'): AdminAnalytics {
 const generatedAt='2026-11-06T10:30:00Z';
 const start=range==='all'?new Date('2026-09-01T00:00:00Z'):new Date(Date.UTC(2026,10,6-(Number(range)-1)));
 const end=new Date('2026-11-06T00:00:00Z');
 const granularity=range==='all'?'month':range==='90'?'week':'day';
 const bucket=(date:string)=>{const d=new Date(date.slice(0,10)+'T00:00:00Z');if(granularity==='month')d.setUTCDate(1);else if(granularity==='week')d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d.toISOString().slice(0,10);};
 const points=new Map<string,AnalyticsPoint>();
 for(let d=new Date(start);d<=end;d.setUTCDate(d.getUTCDate()+1)){const date=bucket(d.toISOString());if(!points.has(date))points.set(date,{date,tournaments:0,completions:0,teams:0,registrations:0,publishedRounds:0,publishedResults:0});}
 for(const event of events){if(new Date(event.date)<start)continue;const p=points.get(bucket(event.date));if(p)for(const key of ['tournaments','completions','teams','registrations','publishedRounds','publishedResults'] as const)p[key]+=event[key];}
 const series=[...points.values()];
 const sum=(key:Exclude<keyof AnalyticsPoint,'date'>)=>series.reduce((n,p)=>n+p[key],0);
 const op=(i:number,status:string)=>({id:tournaments[i]?.id??tournaments[0].id,name:tournaments[i]?.name??tournaments[0].name,status,startsAt:tournaments[i]?.startsAt??generatedAt,occupied:5,capacity:20,rounds:4,published:status==='completed'?4:0});
 return {generatedAt,range,timezone:'Asia/Baku',granularity,start:start.toISOString(),totals:{tournaments:3,completed:1,active:2,teams:10,registrations:17,playedRounds:6,pendingApprovals:4,publishedResults:30,pendingTeams:1,pendingRegistrations:1,pendingVerifications:1,pendingRosters:1},period:{tournaments:sum('tournaments'),completions:sum('completions'),teams:sum('teams'),registrations:sum('registrations'),uniqueTeams:range==='all'?8:6,publishedRounds:sum('publishedRounds'),publishedResults:sum('publishedResults')},series,lifecycle:[{status:'draft',count:1},{status:'ongoing',count:1},{status:'completed',count:1}],upcoming:[op(0,'registration-open')],completed:[op(1,'completed')],attention:[op(0,'ongoing')],approvals:[{id:'pending-team',name:'Pending fixture team',kind:'team',createdAt:'2026-11-05T12:00:00Z',href:'/admin/teams/team-01'}],activity:[{id:'audit-1',action:'results.publish',createdAt:'2026-11-05T12:00:00Z',href:'/admin/results'}]};
}
