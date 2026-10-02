import { useState } from 'react';
import { Select } from '../common/primitives';
import { deriveWrappedSummary, yearPeriod } from '../../utils/wrapped';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTeamPlatformData } from '../../services/PlatformDataContext';
import { competitionNow } from '../../services';

export function CareerNav() {
  const {pathname,hash}=useLocation();
  const links=[['/team/career','Karyera xülasəsi'],['/team/history','Matç tarixçəsi'],['/team/career#maps','Xəritələr'],['/team/comparison','Müqayisə'],['/team/sharecards','Paylaşım studiyası'],['/team/career#wrapped','Wrapped']];
  return <nav className="career-nav" aria-label="Karyera bölmələri">{links.map(([to,label])=>{const active=pathname+hash===to;return <Link key={to} to={to} className={active?'active':undefined} aria-current={active?'page':undefined}>{label}</Link>;})}</nav>;
}
export function TeamWrappedEntry({ year = competitionNow().getFullYear() }: { year?: number }) {
  const { currentTeam, matchHistory } = useTeamPlatformData();
  const [selectedYear, setSelectedYear] = useState(year);
  const years = [...new Set([year, ...matchHistory.map(match => new Date(match.playedAt).getFullYear())])].sort((a, b) => b - a);
  const summary = deriveWrappedSummary({ team: currentTeam, period: yearPeriod(selectedYear), matches: matchHistory });
  return <section id="wrapped" className="team-wrapped-entry"><div><span>// MÖVSÜMÜN İZİ</span><h2>{selectedYear} WRAPPED</h2><p>{summary.matches} matç · {summary.wwcd} WWCD · {summary.kills} kill</p></div><Select label="Wrapped ili" value={selectedYear} onChange={event => setSelectedYear(Number(event.target.value))}>{years.map(value => <option key={value} value={value}>{value}</option>)}</Select>{summary.available ? <Link className="button button--secondary" to={`/teams/${encodeURIComponent(currentTeam.slug ?? currentTeam.id)}/wrapped/${selectedYear}`}>İcmalı aç <ArrowRight size={17} /></Link> : <p>Wrapped üçün bu ildə ən azı 3 dərc edilmiş matç lazımdır.</p>}</section>;
}
