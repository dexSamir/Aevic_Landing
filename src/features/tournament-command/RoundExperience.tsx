import { ArrowLeft, ArrowRight, CalendarDays, Crosshair, Info, Layers, Map, Trophy } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { Button, StatusBadge, Tabs, TeamLogo } from '../../components/common/primitives';
import { mapArtwork } from '../../assets/maps';
import { services } from '../../services';
import { usePlatformQuery } from '../../services/queryCache';
import type { TeamPlatformSnapshot } from '../../types/domain';
import type { TeamCompetitionContext } from '../../utils/teamCompetitionContext';
import { tournamentMatches } from '../../utils/tournamentMatches';
import { commandMatch, eventTime, stageLabels } from './model';
import { MatchClock } from './MatchClock';
import { tournamentDates } from './TournamentSelector';

export function AllRounds({context,onSelect}:{context:TeamCompetitionContext;onSelect:(id:string)=>void}) {
 const title=useRef<HTMLHeadingElement>(null);
 useLayoutEffect(()=>{title.current?.focus();},[]);
 const rounds=tournamentMatches(context.tournament.id,context.matches,context.history),next=commandMatch(context.matches,context.tournament);
 return <div className="rounds-list"><div className="rounds-intro"><Map/><div><h3 ref={title} tabIndex={-1}>Bütün raundlar</h3><p>{context.tournament.name} · {rounds.length} raund · {tournamentDates(context.tournament.startsAt,context.tournament.endsAt)}</p></div></div>
 <div className="round-list-head" aria-hidden="true"><span>#</span><span>Xəritə</span><span>Status</span><span>Tarix və vaxt (Bakı vaxtı)</span><span>Nəticə</span></div>
 {!rounds.length&&<p>Raund proqramı hələ paylaşılmayıb.</p>}
 <ol>{rounds.map(round=>{const active=round.id===next?.id, published=context.history.some(row=>row.id===round.id);return <li key={round.id}><button className="round-list-row" data-next={active} onClick={()=>onSelect(round.id)}><b className="round-badge">R{round.round??'—'}</b><span className="round-map">{mapArtwork[round.map.toLowerCase()]&&<img src={mapArtwork[round.map.toLowerCase()].src} alt=""/>}<strong>{round.map}</strong></span><StatusBadge status={round.status==='completed'?'approved':active?'warning':'draft'}>{round.status==='completed'?'Bitib':round.status==='live'?'CANLI':active?'Növbəti matç':'Planlaşdırılıb'}</StatusBadge><time dateTime={round.date}><CalendarDays size={16}/>{eventTime(round.date)}</time><span className="round-row-action">{published?'Nəticələr':'Məlumatlar'} <ArrowRight size={16}/></span></button></li>;})}</ol></div>;
}

export function RoundDetail({id,context,data,fromList,onList,onStandings,onRoom,eligible,terminal}:{id:string;context:TeamCompetitionContext;data:TeamPlatformSnapshot;fromList:boolean;onList:()=>void;onStandings:()=>void;onRoom:(id:string)=>void;eligible:boolean;terminal:boolean}) {
 const [tab,setTab]=useState('standings');const heading=useRef<HTMLHeadingElement>(null);
 useLayoutEffect(()=>{heading.current?.focus();},[id]);
 const query=usePlatformQuery({key:`command-round:${context.tournament.id}:${id}`,scope:'public',query:signal=>services.publicMatches.get(id,signal),staleTime:0});
 const detail=query.data?.tournament.id===context.tournament.id&&query.data.match.id===id?query.data:undefined;
 const scheduled=context.matches.find(round=>round.id===id),history=context.history.find(round=>round.id===id);
 const match=scheduled??history;
 const published=Boolean(detail?.published),own=published?detail?.teamResults.find(row=>row.teamId===data.currentTeam.id):undefined;
 const official=published?detail?.standings:undefined;
 const ours=official?.find(row=>row.teamId===data.currentTeam.id);
 const date=match?('startsAt'in match?match.startsAt:match.playedAt):undefined;
 const map=match?.map??'Raund';const artwork=mapArtwork[map.toLowerCase()];
 const next=commandMatch(context.matches,context.tournament),upcoming=scheduled&&scheduled.id===next?.id;
 return <div className="round-detail">
 <Button variant="ghost" className="round-back" onClick={onList}>{fromList?<ArrowLeft size={18}/>:<Map size={18}/>} {fromList?'Bütün raundlara qayıt':'Bütün raundlar'}</Button>
 <section className="round-banner" style={artwork?{backgroundImage:`linear-gradient(90deg, #101112 15%, #10111266 100%), url(${artwork.src})`}:undefined}>
 <div><b className="round-badge">R{scheduled?.round??'—'}</b><h3 ref={heading} tabIndex={-1}>{map}</h3></div><div><span><CalendarDays size={18}/> {eventTime(date)} (Bakı vaxtı)</span>{scheduled&&<span>{stageLabels[scheduled.stage]} · Gün {scheduled.day}</span>}<StatusBadge status={published?'approved':'draft'}>{published?'Nəticələr rəsmiləşdirilib':scheduled?.status==='live'?'CANLI':scheduled?.status==='completed'?'Nəticələr gözlənilir':'Planlaşdırılıb'}</StatusBadge></div></section>
 {query.loading&&<p role="status">Raund məlumatı yüklənir…</p>}
 {query.error&&<p role="alert">Raund məlumatı yenilənmədi. <Button variant="secondary" onClick={query.refetch} disabled={query.refreshing}>Yenidən yoxla</Button></p>}
 {!query.loading&&!query.error&&!detail&&<p role="status">Raund məlumatı əlçatan deyil.</p>}
 {published?<><dl className="round-statistics">{[[Trophy,'Yeriniz',own?`#${own.placement}`:'—'],[Layers,'Ümumi xal',own?.totalPoints??'—'],[Crosshair,'Eliminasiya',own?.finishes??'—'],[Layers,'Yer xalı',own?.placementPoints??'—']].map(([Icon,label,value])=>{const MetricIcon=Icon as typeof Trophy;return <div key={String(label)}><MetricIcon/><dd>{String(value)}</dd><dt>{String(label)}</dt></div>;})}</dl>
 {!own&&<p>Komandanızın bu raund üzrə dərc edilmiş nəticəsi yoxdur.</p>}
 <Tabs active={tab} onChange={setTab} label="Raund nəticələri" items={[{id:'standings',label:`Turnir sıralaması (R${scheduled?.round??'—'})`,panelId:'round-tab-content'},{id:'performance',label:'Komandanın performansı',panelId:'round-tab-content'}]}/>
 <div id="round-tab-content" role="tabpanel" tabIndex={0} aria-label={tab==='standings'?'Raund sıralaması':'Komandanın performansı'}>
 {tab==='standings'?official?.length?<div className="round-table-wrap"><table className="round-table"><thead><tr><th>#</th><th>Komanda</th><th>Yer xalı</th><th>Eliminasiya</th><th>Ümumi xal</th></tr></thead><tbody>{[...official].sort((a,b)=>a.placement-b.placement).map(row=>{const team=detail?.teamResults.find(team=>team.teamId===row.teamId);return <tr key={row.teamId} className={row.teamId===data.currentTeam.id?'is-own-team':undefined}><td><span className="command-rank-badge">{row.placement}</span></td><th scope="row"><span className="round-team"><TeamLogo name={team?.teamName??'Komanda'} src={team?.teamLogo} size="sm"/><span>{team?.teamName??'Komanda adı yoxdur'}</span></span></th><td>{row.placementPoints}</td><td>{row.finishes}</td><td>{row.totalPoints}</td></tr>;})}</tbody></table></div>:<p>Rəsmi raund sıralaması hələ əlçatan deyil.</p>:own?<dl className="round-performance">{[['Yer',own.placement],['Eliminasiya',own.finishes],['Yer xalı',own.placementPoints],...(ours?[['Kill xalı',ours.finishPoints]]:[]),['Ümumi xal',own.totalPoints]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>:<p>Komandanızın nəticəsi hələ dərc edilməyib.</p>}
 </div></>:!query.loading&&<section className="round-prematch"><h3>{scheduled?.status==='completed'?'Rəsmi nəticələr gözlənilir':upcoming?'Növbəti matç':'Raund məlumatları'}</h3>{upcoming&&!terminal&&scheduled&&<MatchClock match={scheduled}/>}<p>Əsas heyət: {data.currentTeam.roster.filter(player=>player.role!=='substitute').length}/4 · {data.currentTeam.roster.filter(player=>player.role!=='substitute').length>=4?'Heyət hazırdır':'Heyəti tamamlayın'}</p><p>{terminal?'Turnir üzrə otaq girişi bağlanıb.':eligible?'İştirak və Check-in təsdiqlənib.':'Otağa giriş üçün iştirak və Check-in təsdiqi tələb olunur.'}</p>{scheduled&&scheduled.status!=='completed'&&!terminal&&eligible&&<Button onClick={()=>onRoom(id)}>Matç otağına keç <ArrowRight size={16}/></Button>}<p className="command-muted">Otaq məlumatı yalnız server icazəsi və paylaşılma vaxtı yoxlandıqdan sonra açılır.</p></section>}
 <footer className="round-footer"><span><Info size={19}/>{published?'Nəticələr rəsmi olaraq təsdiqlənib.':'Rəsmi nəticələr hələ dərc edilməyib.'}</span><Button variant="secondary" onClick={onStandings}>Tam turnir sıralaması <ArrowRight size={16}/></Button></footer>
 </div>;
}
