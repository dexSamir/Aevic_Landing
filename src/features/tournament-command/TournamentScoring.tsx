import { useState } from 'react';
import { ArrowRight, ExternalLink, FileText, Skull, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Modal } from '../../components/common/primitives';
import type { Tournament } from '../../types/domain';
import { placementPointGroups } from '../../utils/scoring';
import { scoringRuleLabel } from './model';

export function TournamentScoring({ tournament }: { tournament: Tournament }) {
  const [rule, setRule] = useState<string>();
  const formula = tournament.pointFormula;
  return <>
    <section id="rules" tabIndex={-1} className="command-section" aria-labelledby="command-rules-title">
      <h2 id="command-rules-title"><Star /> Xal sistemi</h2>
      <div className="command-scoring-columns"><div><h3>Yerləşmə xalları</h3><dl className="command-formula">{placementPointGroups(formula, tournament.maxSlots).map(group => <div key={group.first}><dt>{group.first === group.last ? `#${group.first}` : `#${group.first}–${group.last}`}</dt><dd>{group.points} xal</dd></div>)}</dl></div><div className="command-kill-points"><h3><Skull size={14} /> Kill xalları</h3><p>Hər eliminasiya üçün</p><strong>{formula.finishPointValue} xal</strong></div></div>
      <details className="command-scoring-details"><summary>Xallar necə hesablanır?</summary><p>WWCD bonusu: {formula.wwcdBonus} xal · Standart cərimə: {formula.defaultPenalty} xal</p><p>Cərimələr ümumi xaldan çıxılır. Rəsmi nəticələrdə saxlanılmış yekun xallar əsas götürülür.</p><h3>Bərabərlik zamanı üstünlük sırası</h3><ol>{formula.tieBreakRules.map((rule, index) => <li key={index}>{scoringRuleLabel(rule)}</li>)}</ol></details>
    </section>
    <section className="command-section command-rule-links"><h2><FileText /> Turnir qaydaları</h2><div className="command-links">
      {tournament.rules.map((text, index) => <button type="button" key={`${index}:${text}`} onClick={() => setRule(text)}><span>{text}</span><ArrowRight size={15} /></button>)}
      <Link to="/regulations">Ümumi qaydalar <ExternalLink size={15} /></Link>
      <Link to={`/tournaments/${tournament.id}#rules`}>Turnirin bütün qaydaları <ArrowRight size={15} /></Link>
    </div><details><summary>Əlavə keçidlər</summary><div className="command-links"><Link to="/team/notifications">Ümumi bildirişlər <ArrowRight size={15} /></Link><Link to="/team/disputes">Etirazlarım <ArrowRight size={15} /></Link></div></details></section>
    <Modal open={rule !== undefined} title={tournament.name} onClose={() => setRule(undefined)}><p>{rule}</p></Modal>
  </>;
}
