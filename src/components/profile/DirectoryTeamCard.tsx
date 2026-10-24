import { RecentPlacementStrip } from '../common/RecentPlacementStrip';
import { Link } from 'react-router-dom';
import { TeamLogoTile } from '../common/primitives';
import { TeamFollowButton } from './TeamFollowButton';
import { VerificationCrest } from './ProfileElements';
import type { PublicTeamSummary, TeamComparisonRecord } from '../../types/domain';

export function DirectoryTeamCard({ team, ordinal, compareMode, selected, ownTeam, registration, record, onToggle, onOpen }: { team: PublicTeamSummary; ordinal: number; compareMode: boolean; selected: boolean; ownTeam: boolean; registration?: { label: string; tournamentId: string }; record?: TeamComparisonRecord; onToggle: (id: string) => void; onOpen: () => void }) {
  const historyAvailable = team.historyAvailable;
  const form = [...(team.form ?? [])].sort((a, b) => Date.parse(b.playedAt) - Date.parse(a.playedAt));
  const podiums = record?.podiums;
  return <div role="listitem" tabIndex={0} aria-label={team.name} onKeyDown={event => { if (event.target !== event.currentTarget || !['Enter', ' '].includes(event.key)) return; event.preventDefault(); if (compareMode) onToggle(team.id); else onOpen(); }} className={`team-directory-card ${compareMode ? 'is-comparing' : ''} ${selected ? 'is-comparison-selected' : ''}`} onClick={event => { const nested = (event.target as HTMLElement).closest('a, button, input, label, select, [tabindex]'); if (nested && nested !== event.currentTarget) return; if (compareMode) onToggle(team.id); else onOpen(); }}>
    <div className="directory-card-top"><span>{String(ordinal).padStart(2, '0')}</span><div className="directory-card-badges">{ownTeam && <span className="directory-own-team">Sizin komanda</span>}{registration && <Link className="directory-registration" to={`/tournaments/${registration.tournamentId}`} data-tooltip={registration.label}>{registration.label}</Link>}</div><div className="directory-follow"><TeamFollowButton teamId={team.id}/></div></div>
    {compareMode && <input className="team-directory-card__check" type="checkbox" aria-label={`${team.name} müqayisə üçün seç`} checked={selected} onChange={() => onToggle(team.id)} />}
    <TeamLogoTile logoSizes="92px" revealVariant="names-only" id={team.id} name={team.name} tag={team.tag} logoUrl={team.logoUrl} profileHref={`/teams/${team.slug}`} selected={selected} onSelect={compareMode ? onToggle : undefined} meta={<>{team.rosterSize} oyunçu<span className="directory-secondary-meta">{[team.tier, team.sourceStatus].filter(Boolean).map(value => ` · ${value}`).join('')}</span></>} />
    {team.verificationLevel && <div className="directory-verification"><span className="directory-verification-desktop"><VerificationCrest level={team.verificationLevel} /></span><span className="directory-verification-mobile">{team.verificationLevel === "verified" ? "Rəsmi komanda" : team.verificationLevel === "legacy" ? "İrs komandası" : team.verificationLevel === "approved" ? "Təsdiqlənmiş" : "Qeydiyyatda"}</span></div>}
    {team.legacyHistoryIncomplete && <small className="directory-history-note">Tam yarış tarixçəsi hələ əlçatan deyil.</small>}
    <div className="directory-competitive"><span><strong>{record?.wwcd ?? '—'}</strong> WWCD</span><span tabIndex={0} data-tooltip="Dərc edilmiş matçlarda ilk üç yer"><strong>{podiums ?? '—'}</strong> PODİUM</span></div>
    <div className="directory-recent"><span>Son nəticələr</span><div>{form.length ? <RecentPlacementStrip results={form} showDetails={false} /> : <small>{historyAvailable === false ? 'Nəticə formatı dəstəklənmir' : team.form === undefined ? 'Nəticələrə profildə baxın' : 'Dərc edilmiş nəticə yoxdur'}</small>}</div></div>
    <Link className={`directory-profile-link${compareMode ? "" : " directory-profile-link--mobile"}`} to={`/teams/${team.slug}`}>Public profil</Link>
  </div>;
}
