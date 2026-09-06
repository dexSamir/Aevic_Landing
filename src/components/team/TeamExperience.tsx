import { ArrowRight, CalendarClock, Check, ChevronRight, KeyRound, Megaphone, Swords, TrendingUp, Trophy, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CareerSummaryData, MatchHistoryEntry, MatchScheduleItem, TeamAnnouncement, TeamComparisonRecord, TeamTournamentResult } from '../../types/domain';
import { IconButton, Select, StatusBadge, TeamLogo } from '../common/primitives';

export function CareerSummary({ data, comparisonHref = '/team/comparison' }: { data: CareerSummaryData; comparisonHref?: string }) {
  const prestigeMetrics = new Set(['wwcd', 'championships', 'podiums']);
  return <section className="career-summary" aria-labelledby="career-summary-title"><header><div><span>{data.scopeLabel}</span><h2 id="career-summary-title">Karyera xülasəsi</h2></div><Link to={comparisonHref}>Komandaları müqayisə et<ChevronRight size={17} /></Link></header><div className="career-summary__rail" tabIndex={0} aria-label="Karyera göstəriciləri; üfüqi sürüşdürün">{data.metrics.map((metric, index) => <article className={prestigeMetrics.has(metric.key) ? 'is-prestige' : undefined} key={metric.key}><span>{String(index + 1).padStart(2, '0')}</span><strong>{metric.value}</strong><h3>{metric.label}</h3><p>{metric.description}</p></article>)}</div></section>;
}

export function PerformanceSummary({ result, recentMatches }: { result: TeamTournamentResult; recentMatches: MatchHistoryEntry[] }) {
  const recentPoints = recentMatches.reduce((sum, match) => sum + match.points, 0);
  const recentFinishes = recentMatches.reduce((sum, match) => sum + match.finishes, 0);
  return <section className="performance-summary" aria-labelledby="performance-summary-title"><header><div><span>Published demo results</span><h2 id="performance-summary-title">Performans icmalı</h2></div><TrendingUp size={21} /></header><div className="performance-summary__lead"><strong>#{String(result.placement).padStart(2, '0')}</strong><span>Daily Cup #24 placement</span></div><dl><div><dt>Matç</dt><dd>{result.matches}</dd></div><div><dt>WWCD</dt><dd>{result.wwcd}</dd></div><div><dt>Kill</dt><dd>{result.finishes}</dd></div><div><dt>Xal</dt><dd>{result.totalPoints}</dd></div></dl><footer><Swords size={17} /><span>Son {recentMatches.length} dərc edilmiş raund: <strong>{recentPoints} xal · {recentFinishes} kill</strong></span></footer></section>;
}

function comparableValue(record: TeamComparisonRecord, key: keyof TeamComparisonRecord) {
  const value = record[key];
  return typeof value === 'number' ? String(value) : '—';
}

export function TeamComparison({ records, initialLeftId, initialRightId, invalidSelection = false }: { records: TeamComparisonRecord[]; initialLeftId?: string; initialRightId?: string; invalidSelection?: boolean }) {
  const [leftId, setLeftId] = useState(initialLeftId ?? records[1]?.teamId ?? records[0]?.teamId ?? '');
  const [rightId, setRightId] = useState(initialRightId ?? records[0]?.teamId ?? '');
  const left = useMemo(() => records.find((record) => record.teamId === leftId), [leftId, records]);
  const right = useMemo(() => records.find((record) => record.teamId === rightId), [rightId, records]);
  const rows: { key: keyof TeamComparisonRecord; label: string }[] = [
    { key: 'matches', label: 'Matç' },
    { key: 'finishes', label: 'Kill' },
    { key: 'wwcd', label: 'WWCD' },
    { key: 'averagePoints', label: 'Orta xal' },
    { key: 'championships', label: 'Çempionluq' },
    { key: 'podiums', label: 'Podium' },
  ];
  return <section className="team-comparison" aria-label="Komanda müqayisəsi">{invalidSelection && <div className="team-comparison__invalid" role="alert"><strong>URL-dəki komanda tapılmadı.</strong><span>Müqayisə üçün aşağıdan etibarlı komanda seçin.</span></div>}<div className="team-comparison__selectors"><Select label="Birinci komanda" value={leftId} onChange={(event) => setLeftId(event.target.value)}>{!left && <option value="">Komanda seçin</option>}{records.map((record) => <option key={record.teamId} value={record.teamId}>{record.teamName}</option>)}</Select><span aria-hidden="true">VS</span><Select label="İkinci komanda" value={rightId} onChange={(event) => setRightId(event.target.value)}>{!right && <option value="">Komanda seçin</option>}{records.map((record) => <option key={record.teamId} value={record.teamId}>{record.teamName}</option>)}</Select></div>{left && right ? <><div className="team-comparison__identity"><div><TeamLogo name={left.teamName} size="lg" /><h2>{left.teamName}</h2></div><Trophy size={26} aria-hidden="true" /><div><TeamLogo name={right.teamName} size="lg" /><h2>{right.teamName}</h2></div></div><dl>{rows.map((row) => <div key={row.key}><dd>{comparableValue(left, row.key)}</dd><dt>{row.label}</dt><dd>{comparableValue(right, row.key)}</dd></div>)}</dl><p>“—” həmin komanda üçün dərc edilmiş mənbə məlumatının olmadığını göstərir. Göstəricilər fictional demo dataset-dən gəlir.</p></> : <p className="team-comparison__prompt">İki etibarlı komanda seçildikdən sonra nəticələr göstəriləcək.</p>}</section>;
}

export function SchedulePreviewLink() {
  return <Link className="schedule-preview-link" to="/team/tournaments"><CalendarClock size={18} /><span>Bütün turnir cədvəli</span><ArrowRight size={16} /></Link>;
}
