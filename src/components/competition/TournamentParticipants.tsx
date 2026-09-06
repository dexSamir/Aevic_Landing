import { ArrowRight, Users } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import type { TournamentParticipant } from '../../types/domain';
import { EmptyState, SectionHeading, TeamLogo, TeamLogoTile } from '../common/primitives';

function RosterLine({ participant }: { participant: TournamentParticipant }) {
  return <p>{participant.roster.map((member) => member.ign).join(' · ')}</p>;
}

export function TournamentParticipantField({ participants }: { participants: TournamentParticipant[] }) {
  const [activeId, setActiveId] = useState(participants[0]?.team.id ?? '');
  const detailId = useId();

  useEffect(() => {
    if (!participants.some((participant) => participant.team.id === activeId)) setActiveId(participants[0]?.team.id ?? '');
  }, [activeId, participants]);

  const active = participants.find((participant) => participant.team.id === activeId) ?? participants[0];

  return <section id="participants" className="tournament-participant-field" aria-labelledby="participant-field-title">
    <SectionHeading
      headingId="participant-field-title"
      title="İştirakçı komandalar"
      description={participants.length ? `${participants.length} təsdiqlənmiş iştirakçı · public heyət görünüşü` : 'Yalnız təsdiqlənmiş iştirakçılar dərc edilir'}
      action={<Link to="/teams">Komanda kataloqu</Link>}
    />
    {participants.length ? <>
      <div className="participant-field-grid" role="list" aria-label={`${participants.length} təsdiqlənmiş iştirakçı komanda`}>
        {participants.map((participant, index) => {
          const selected = participant.team.id === active?.team.id;
          return <div role="listitem" key={participant.team.id}><TeamLogoTile id={participant.team.id} name={participant.team.name} tag={participant.team.tag} logoUrl={participant.team.logoUrl} roster={participant.roster.map((member) => member.ign)} profileHref={`/teams/${participant.team.slug}`} selected={selected} onSelect={setActiveId} ordinal={index + 1} className="participant-field-item" selectLabel={`${participant.team.name} heyətini göstər`} controlsId={detailId} /></div>;
        })}
      </div>
      {active && <div className="participant-field-mobile-detail" id={detailId} aria-live="polite">
        <div><TeamLogo name={active.team.name} src={active.team.logoUrl} size="lg" /><span><small>{active.team.tag || 'PUBG MOBILE'}</small><strong>{active.team.name}</strong></span></div>
        <RosterLine participant={active} />
        <Link className="button button--secondary" to={`/teams/${active.team.slug}`}><Users size={17} /><span>Komanda profili və heyət</span><ArrowRight size={16} /></Link>
      </div>}
    </> : <EmptyState icon={<Users size={27} />} title="İştirakçılar hələ təsdiqlənməyib" body="Bu turnirə təsdiqlənmiş qeydiyyatlar olduqda iştirakçılar burada görünəcək. Komanda kataloqunda olmaq turnirdə iştirak demək deyil." action={<Link className="text-link" to="/regulations#rule-1">İştirak şərtlərinə bax</Link>} />}
  </section>;
}
