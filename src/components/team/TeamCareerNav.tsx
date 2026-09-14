import { useState } from 'react';
import { Select } from '../common/primitives';
import { deriveWrappedSummary, yearPeriod } from '../../utils/wrapped';
import { Link, NavLink } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTeamPlatformData } from '../../services/PlatformDataContext';
import { competitionNow } from '../../services';

export function CareerNav() {
  return <nav className="career-nav" aria-label="Karyera bölmələri"><NavLink to="/team/career" end>Karyera xülasəsi</NavLink><NavLink to="/team/history">Matç tarixçəsi</NavLink><Link to="/team/career#maps">Xəritələr</Link><NavLink to="/team/comparison">Müqayisə</NavLink><NavLink to="/team/sharecards">Paylaşım studiyası</NavLink><Link to="/team/career#wrapped">Wrapped</Link></nav>;
}
export function TeamWrappedEntry({ year = competitionNow().getFullYear() }: { year?: number }) {
  const { currentTeam, matchHistory } = useTeamPlatformData();
  const [selectedYear, setSelectedYear] = useState(year);
  const years = [...new Set([year, ...matchHistory.map(match => new Date(match.playedAt).getFullYear())])].sort((a, b) => b - a);
  const summary = deriveWrappedSummary({ team: currentTeam, period: yearPeriod(selectedYear), matches: matchHistory });
  return <section id="wrapped" className="team-wrapped-entry"><div><span>// MÖVSÜMÜN İZİ</span><h2>{selectedYear} WRAPPED</h2><p>{summary.matches} matç · {summary.wwcd} WWCD · {summary.kills} kill</p></div><Select label="Wrapped ili" value={selectedYear} onChange={event => setSelectedYear(Number(event.target.value))}>{years.map(value => <option key={value} value={value}>{value}</option>)}</Select>{summary.available ? <Link className="button button--secondary" to={`/teams/${encodeURIComponent(currentTeam.slug ?? currentTeam.id)}/wrapped/${selectedYear}`}>İcmalı aç <ArrowRight size={17} /></Link> : <p>Wrapped üçün bu ildə ən azı 3 dərc edilmiş matç lazımdır.</p>}</section>;
}
