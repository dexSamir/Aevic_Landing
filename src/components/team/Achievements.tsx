import '../../styles/team-profile-components.css';
import type { CSSProperties } from 'react';
import { Award, Calendar, Crosshair, Crown, Flame, Medal, Shield, Target, Trophy } from 'lucide-react';
import type { AchievementIcon, AchievementTier, Team, TeamAchievement, TeamLegacyStats } from '../../types/domain';
import { TeamLogo } from '../common/primitives';
import { VerificationCrest } from '../profile/ProfileElements';

const stateCopy = { locked: 'Kilidli', progress: 'Davam edir', unlocked: 'Qazanılıb' } as const;

const artworkIcons = { award: Award, calendar: Calendar, crosshair: Crosshair, crown: Crown, flame: Flame, medal: Medal, shield: Shield, target: Target, trophy: Trophy };
export function BadgeArtwork({ compact = false, tier, icon = 'award' }: { compact?: boolean; tier?: AchievementTier; icon?: AchievementIcon }) {
  const Icon = artworkIcons[icon];
  return <div className={`badge-artwork-placeholder badge-artwork-placeholder--${tier ?? 'bronze'} ${compact ? 'badge-artwork-placeholder--compact' : ''}`} aria-hidden="true"><Icon size={compact ? 20 : 36} strokeWidth={1.6} /></div>;
}

export function AchievementProgress({ achievement }: { achievement: TeamAchievement }) {
  if (!achievement.progress) return null;
  const percent = Math.min(100, Math.round((achievement.progress.current / achievement.progress.target) * 100));
  return <div className="achievement-progress"><div><span>{achievement.progress.current} / {achievement.progress.target} {achievement.progress.unit}</span><strong>{percent}%</strong></div><span role="progressbar" aria-label={`${achievement.title} irəliləyişi`} aria-valuenow={Math.min(achievement.progress.current, achievement.progress.target)} aria-valuemin={0} aria-valuemax={achievement.progress.target}><i style={{ '--achievement-progress': `${percent}%` } as CSSProperties} /></span></div>;
}

export function AchievementMedal({ achievement, compact = false, featured = false, rank }: { achievement: TeamAchievement; compact?: boolean; featured?: boolean; rank?: number }) {
  return <article className={`achievement-medal achievement-medal--${achievement.state} achievement-medal--${achievement.tier} ${compact ? 'achievement-medal--compact' : ''} ${featured ? 'achievement-medal--featured' : ''}`} tabIndex={featured ? 0 : undefined} aria-label={`${achievement.title}. ${achievement.description}. ${achievement.tier} tier. ${stateCopy[achievement.state]}.`}>
    <div className="achievement-medal__insignia"><BadgeArtwork compact={compact} tier={achievement.tier} icon={achievement.icon} /><small>{rank ? String(rank).padStart(2, '0') : achievement.tier.slice(0, 1).toUpperCase()}</small></div>
    <div className="achievement-medal__copy"><span>{achievement.category} · {achievement.tier}</span><h3>{achievement.title}</h3>{!compact && <p>{achievement.description}</p>}{achievement.unlockedAt && <time dateTime={achievement.unlockedAt}>{new Date(achievement.unlockedAt).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short', year: 'numeric' })}</time>}</div>
    {!compact && achievement.state !== 'unlocked' && <AchievementProgress achievement={achievement} />}
  </article>;
}

export const AchievementBadge = AchievementMedal;

export function AchievementGrid({ achievements, limit, compact = false }: { achievements: TeamAchievement[]; limit?: number; compact?: boolean }) {
  const visible = (typeof limit === 'number' ? achievements.slice(0, limit) : [...achievements]).sort((a, b) => Number(a.state !== 'unlocked') - Number(b.state !== 'unlocked') || a.displayOrder - b.displayOrder);
  return <section className={`achievement-grid ${compact ? 'achievement-grid--compact' : ''}`} aria-label="Komanda nailiyyətləri">{visible.map((achievement) => <AchievementMedal key={achievement.id} achievement={achievement} compact={compact} featured={!compact && achievement.featured} />)}</section>;
}

export function TeamLegacyProfile({ team, stats, compact = false }: { team: Team; stats: TeamLegacyStats; compact?: boolean }) {
  return <section className={`team-legacy-profile ${compact ? 'team-legacy-profile--compact' : ''}`} aria-label={`${team.name} komanda irsi`}>
    <div className="team-legacy-profile__identity"><TeamLogo name={team.name} src={team.logoUrl} size={compact ? 'md' : 'lg'} /><div><span>Team legacy</span><h2>{team.name} <VerificationCrest level={team.verificationLevel} /></h2><p>{team.tag} · {new Date(stats.foundedAt).toLocaleDateString('az-AZ', { month: 'long', year: 'numeric' })} tarixindən</p></div></div>
    <dl><div><dt>Turnir</dt><dd>{stats.tournaments}</dd></div><div><dt>Qələbə</dt><dd>{stats.wins}</dd></div><div><dt>Top nəticə</dt><dd>{stats.topPlacements}</dd></div><div><dt>Kill</dt><dd>{stats.finishes}</dd></div><div><dt>Nailiyyət</dt><dd>{stats.unlockedAchievements}</dd></div></dl>
    {!compact && <p className="team-legacy-profile__statement">Reputasiya, ranking və irs üçün yarış.</p>}
  </section>;
}
