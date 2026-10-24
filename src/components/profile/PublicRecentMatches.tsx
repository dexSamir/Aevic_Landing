import { Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { mapArtwork } from '../../assets/maps';
import type { MatchHistoryEntry } from '../../types/domain';

const dateFormat = new Intl.DateTimeFormat('az-AZ', {
  day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'Asia/Baku',
});

export function PublicRecentMatches({ matches, historyAvailable }: { matches: readonly MatchHistoryEntry[]; historyAvailable?: boolean }) {
  const recent = [...matches].sort((a, b) => Date.parse(b.playedAt) - Date.parse(a.playedAt)).slice(0, 5);
  const best = [...matches].sort((a, b) => a.placement - b.placement || b.finishes - a.finishes)[0];
  return <section id="matches" className="public-team-section">
    <h2>Son matçlar</h2>
    {recent.length ? <ol className="public-match-history" aria-label="Dərc edilmiş komanda nəticələri">
      {recent.map(match => {
        const artwork = mapArtwork[match.map.trim().toLowerCase()];
        const playedAt = new Date(match.playedAt);
        return <li key={match.id}>
          <Link className={match.placement === 1 ? 'is-winner' : ''} to={`/tournaments/${match.tournamentId}#results`} state={{ roundId: match.id }}>
            <span className="public-match-placement" aria-label={`${match.placement}-ci yer`}><span className="public-match-hash">#</span>{match.placement}</span>
            <span className="public-match-thumbnail" aria-hidden="true">
              {artwork && <img src={artwork.src} srcSet={artwork.srcSet} sizes="32px" width={32} height={36} loading="lazy" decoding="async" alt="" onError={event => { event.currentTarget.hidden = true; }} />}
            </span>
            <div className="public-match-identity"><strong>{match.map}</strong><span>{match.tournamentName}</span><small>{match.stageLabel}</small></div>
            <time dateTime={match.playedAt}>{Number.isFinite(playedAt.getTime()) ? dateFormat.format(playedAt) : '—'}</time>
            <dl>
              <div><dt>Kill</dt><dd>{match.finishes ?? '—'}</dd></div>
              <div className="public-match-points"><dt>Xal</dt><dd>{match.points ?? '—'}</dd></div>
              {/* The public result contract has no round count. Never substitute points or an array index. */}
              <div className="public-match-rounds"><dt>Raund</dt><dd aria-label="Raund sayı əlçatan deyil">—</dd></div>
            </dl>
            {match.id === best?.id && <Trophy className="public-match-award" size={18} aria-label="Ən yaxşı nəticə" />}
          </Link>
        </li>;
      })}
    </ol> : <p className="public-team-empty">{historyAvailable === false ? 'Matç nəticələrinin formatı hələ dəstəklənmir.' : 'Komandanın mövcud nəticələr sahəsində matç yoxdur. Digər tarixçə mənbələri hələ əlçatan deyil.'}</p>}
  </section>;
}
