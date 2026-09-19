/** Browser UI regression fixtures at the HTTP boundary. These are NOT live backend tests. */
import {test as base,expect} from '@playwright/test';
import {fixtureServices as s} from '../fixtures/component-services';
import {MOCK_COMPETITION_NOW_ISO} from '../fixtures/clock';
export {expect};
export const test=base.extend({
 page:async({page},use)=>{
  await page.clock.install({time:new Date(MOCK_COMPETITION_NOW_ISO)});
  await page.route('**/api/**',async route=>{
   const request=route.request(),url=new URL(request.url()),path=url.pathname.slice(4),method=request.method(),q=url.searchParams;
   let body:any={};try{body=request.postDataJSON()??{};}catch{/* no body */}
   const key=`${method} ${path}`;let value:unknown;let found=true;
   try{
    if(key==='GET /public/context')value=await s.snapshots.public();
    else if(key==='GET /me/session'){await s.auth.login(page.url().includes('/admin')?'admin@example.test':'team@example.test','test-fixture');value=await s.auth.getSession();}
    else if(key==='GET /me/context')value=await s.snapshots.team();
    else if(key==='GET /admin/context')value=await s.snapshots.admin();
    else if(key==='GET /me/team')value=await s.teams.current();
    else if(key==='GET /tournaments')value=await s.tournaments.list();
    else if(key==='GET /public/teams')value=await s.profiles.listTeams();
    else if(key==='GET /organizations')value=await s.organizations.list();
    else if(key==='GET /records')value=await s.records.list();
    else if(key==='GET /archive')value=await s.archive.seasons();
    else if(key==='GET /search')value=await s.search.public(q.get('q')??'');
    else if(key==='GET /matches')value=q.get('status')==='completed'?await s.publicMatches.history():await s.publicMatches.schedule();
    else if(key==='GET /me/notifications')value=await s.notifications.inbox();
    else if(key==='GET /me/messages')value=(await s.snapshots.team()).adminMessages;
    else if(key==='GET /me/notification-preferences')value=await s.notifications.preferences();
    else if(key==='PUT /me/notification-preferences')value=await s.notifications.updatePreferences(body);
    else if(key==='GET /me/account')value=await s.account.profile();
    else if(key==='GET /me/2fa')value=await s.account.twoFactorStatus();
    else if(key==='GET /me/sessions')value=await s.account.sessions();
    else if(key==='GET /me/follows')value=await s.follows!.list();
    else if(key==='GET /me/follows/status')value=await s.follows!.status('TEAM',q.get('entityId')!);
    else if(key==='PUT /me/follows')value=await s.follows!.mutate(body);
    else if(key==='POST /auth/login')value=await s.auth.login(body.email,body.password);
    else if(key==='POST /auth/logout')value=await s.auth.logout();
    else if(key==='POST /auth/password-reset')value=await s.auth.requestPasswordReset(body.email);
    else if(key==='POST /auth/password-reset/inspect')value=await s.auth.inspectPasswordReset(body.token);
    else if(key==='POST /auth/email-verification/inspect')value=await s.auth.inspectEmailVerification(body.token);
    else if(key==='GET /roster-requests')value=await s.rosterRequests.list(q.get('teamId')??undefined);
    else if(key==='GET /disputes')value=await s.disputes.list(q.get('teamId')??undefined);
    else if(key==='GET /me/support/tickets')value=await s.support.listTickets();
    else {
     const parts=path.split('/').filter(Boolean).map(decodeURIComponent);
     if(method==='GET'&&parts[0]==='public'&&parts[1]==='teams'&&parts.length===3)value=await s.profiles.teamBySlug(parts[2]);
     else if(method==='GET'&&parts[0]==='tournaments'){
      const id=parts[1];const action=parts[2];
      if(!action)value=await s.tournaments.get(id);else if(action==='participants')value=await s.tournaments.publicParticipants(id);else if(action==='slots')value=await s.tournaments.slots(id);else if(action==='recap')value=await s.tournaments.recap(id);else found=false;
     }else if(method==='GET'&&parts[0]==='leaderboards')value=parts[2]==='movement'?await s.results.movement(parts[1]):parts[2]==='snapshots'?await s.results.snapshots(parts[1]):await s.results.leaderboard(parts[1]);
     else if(method==='GET'&&parts[0]==='organizations')value=await s.organizations.getBySlug(parts[1]);
     else if(method==='GET'&&parts[0]==='matches')value=await s.publicMatches.get(parts[1]);
     else if(method==='GET'&&parts[0]==='records')value=parts[2]==='history'?await s.records.history(parts[1]):await s.records.get(parts[1]);
     else if(method==='GET'&&parts[0]==='teams'&&parts[2]==='wrapped')value=await s.wrapped.forTeam(parts[1],{type:'year',year:Number(q.get('year')),label:q.get('year')!,startDate:`${q.get('year')}-01-01T00:00:00Z`,endDate:`${q.get('year')}-12-31T23:59:59Z`});
     else if(method==='PUT'&&parts[0]==='teams'&&parts[2]==='social-links')value=await s.teams.updateSocialLinks(parts[1],body);
     else if(method==='PATCH'&&parts[0]==='teams'&&parts.length===2)value=await s.teams.updateProfile(parts[1],body);
     else found=false;
    }
    if(!found)return route.fulfill({status:501,contentType:'application/json',body:JSON.stringify({code:'TEST_FIXTURE_NOT_DEFINED',path})});
    return route.fulfill({status:value===undefined?204:200,contentType:'application/json',body:value===undefined?undefined:JSON.stringify(value)});
   }catch{return route.fulfill({status:503,contentType:'application/json',body:'{"code":"TEST_FIXTURE_ERROR"}'});}
  });
  await use(page);
 },
});
