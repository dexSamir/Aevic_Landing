import { ArrowRight, CalendarDays, Flag } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PublicTeamSummary, Team, Tournament } from '../../types/domain';
import { TeamLogo } from '../common/primitives';
import { MediaBackdrop } from '../common/MediaBackdrop';
import { SocialLinkList, VerificationCrest } from './ProfileElements';
import { ShareProfileAction } from './PublicTeamExperience';
import './public-team-identity.css';

/** One public identity composition, reused by the owner preview. No private account data. */
export function PublicTeamIdentity({ team, details, live, preview = false }: { team: Team | PublicTeamSummary; details?: Team; live?: Tournament; preview?: boolean }) {
  const captain = details?.roster.find(player => player.role === 'captain');
  const founded = details?.foundedAt ? new Date(details.foundedAt).getFullYear() : undefined;
  const Heading = preview ? 'h2' : 'h1';
  return <header className={`public-team-hero${preview ? ' public-team-hero--preview' : ''}`}>
    {preview && details?.bannerUrl?.startsWith('blob:') ? <img className="public-team-hero__banner public-team-local-banner" src={details.bannerUrl} alt={details.bannerAlt ?? 'Lokal banner önbaxışı'} /> : details?.bannerUrl && <MediaBackdrop src={details.bannerUrl} alt={details.bannerAlt ?? `${team.name} banneri`} className="public-team-hero__banner" priority={!preview} />}
    <div className="public-team-width public-team-hero__grid">
      <div className="public-team-hero__copy">
        {live && <Link className="public-team-live" to={`/tournaments/${live.id}`}><i aria-hidden="true" />Canlı: {live.name}<ArrowRight size={17} /></Link>}
        <span className="public-team-eyebrow">// PUBG MOBILE</span>
        <Heading>{team.name}</Heading>
        <div className="public-team-tagline">{team.tag && <strong>{team.tag}</strong>}{captain && <span>Kapitan ləqəbi: <b>{captain.ign}</b></span>}</div>
        {details?.description && <p className="public-team-bio">{details.description}</p>}
        <div className="public-team-meta">{team.country && <span><Flag size={18} />{team.country}</span>}{founded && Number.isFinite(founded) && <span><CalendarDays size={18} />{founded}</span>}{team.verificationLevel && <VerificationCrest level={team.verificationLevel} showLabel />}</div>
      </div>
      <div className="public-team-brand">{preview && team.logoUrl?.startsWith('blob:') ? <span className="team-logo"><img src={team.logoUrl} alt={`${team.name} lokal logo önbaxışı`} /></span> : <TeamLogo name={team.name} src={team.logoUrl} size="xl" />}<div className="public-team-social">{!preview && <ShareProfileAction teamName={team.name} />}<SocialLinkList links={details?.socialLinks} ownerName={team.name} compact /></div></div>
    </div>
  </header>;
}
