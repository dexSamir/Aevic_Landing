import { Link } from 'react-router-dom';
import { TeamLogoTile } from '../common/primitives';
import { Bell } from 'lucide-react';
import { VerificationCrest } from './ProfileElements';
import { serviceCapabilities, services } from '../../services';
import { queryPolicy, usePlatformQuery } from '../../services/queryCache';
import type { PublicTeamSummary, TeamComparisonRecord } from '../../types/domain';

export function DirectoryTeamCard({ team, ordinal, compareMode, selected, ownTeam, registration, record, onToggle, onOpen }: { team: PublicTeamSummary; ordinal: number; compareMode: boolean; selected: boolean; ownTeam: boolean; registration?: { label: string; tournamentId: string }; record?: TeamComparisonRecord; onToggle: (id: string) => void; onOpen: () => void }) {
  const profile = usePlatformQuery({ scope:'public', key: `profile:${team.slug}`, query: () => services.profiles.teamBySlug(team.slug), enabled: serviceCapabilities.publicTeamHistory && team.form === undefined, staleTime: queryPolicy.publicCompetition });
  const historyAvailable = team.historyAvailable ?? profile.data?.historyAvailable;
  const form = [...(team.form ?? profile.data?.form ?? [])].sort((a, b) => Date.parse(b.playedAt) - Date.parse(a.playedAt));
  const top10 = form.length ? Math.round(form.filter(item => item.placement <= 10).length / form.length * 100) : undefined;
  return <div role="listitem" tabIndex={0} aria-label={team.name} onKeyDown={event => { if (event.target !== event.currentTarget || !['Enter', ' '].includes(event.key)) return; event.preventDefault(); if (compareMode) onToggle(team.id); else onOpen(); }} className={`team-directory-card ${compareMode ? 'is-comparing' : ''} ${selected ? 'is-comparison-selected' : ''}`} onClick={event => { const nested = (event.target as HTMLElement).closest('a, button, input, label, select, [tabindex]'); if (nested && nested !== event.currentTarget) return; if (compareMode) onToggle(team.id); else onOpen(); }}>
    <div className="directory-card-top"><span>{String(ordinal).padStart(2, '0')}</span><div className="directory-card-badges">{ownTeam && <span className="directory-own-team">Sizin komanda</span>}{registration && <Link className="directory-registration" to={`/tournaments/${registration.tournamentId}`} title={registration.label}>{registration.label}</Link>}</div><div className="directory-follow"><button type="button" disabled aria-label="Komandanı izləmə funksiyası tezliklə"><Bell size={15} aria-hidden="true" /><span>Tezliklə</span></button></div></div>
    {compareMode && <input className="team-directory-card__check" type="checkbox" aria-label={`${team.name} müqayisə üçün seç`} checked={selected} onChange={() => onToggle(team.id)} />}
    <TeamLogoTile revealVariant="names-only" id={team.id} name={team.name} tag={team.tag} logoUrl={team.logoUrl} profileHref={`/teams/${team.slug}`} selected={selected} onSelect={compareMode ? onToggle : undefined} meta={[`${team.rosterSize} oyunçu`, team.tier, team.sourceStatus].filter(Boolean).join(" · ")} />
    {team.verificationLevel && <div className="directory-verification"><VerificationCrest level={team.verificationLevel} /></div>}
    {team.legacyHistoryIncomplete && <small>Tam yarış tarixçəsi hələ əlçatan deyil.</small>}
    <div className="directory-competitive"><span><strong>{record?.wwcd ?? '—'}</strong> WWCD</span><span title="Dərc edilmiş son matçlar üzrə"><strong>{top10 === undefined ? '—' : `${top10}%`}</strong> Top 10 <small>son matçlar</small></span></div>
    <div className="directory-recent"><span>Son nəticələr</span><div>{form.length ? form.slice(0,5).map(item => <span key={item.matchId} className={`directory-result${item.wwcd ? ' directory-result--wwcd' : ''}`} title={`${item.map} · Yer ${item.placement}`} aria-label={item.wwcd ? 'WWCD' : `Yer ${item.placement}`}>{item.wwcd ? <>WW<br />CD</> : item.placement}</span>) : <small>{profile.loading ? 'Nəticələr yüklənir…' : historyAvailable === false ? 'Nəticə formatı dəstəklənmir' : 'Mövcud nəticələr sahəsi boşdur'}</small>}</div></div>
    {compareMode && <Link className="directory-profile-link" to={`/teams/${team.slug}`}>Public profil</Link>}
  </div>;
}
