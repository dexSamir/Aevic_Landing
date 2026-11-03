import '../../styles/tournament-command.css';
import '../../components/common/loading-skeleton.css';

type Panel = 'hero' | 'roadmap' | 'schedule' | 'room' | 'standings' | 'performance' | 'results' | 'scoring' | 'rules';
const Block = ({ kind = 'line' }: { kind?: string }) => <span className={`loading-skeleton__block command-skeleton-${kind}`} />;

export function CommandPanelSkeleton({ kind }: { kind: Panel }) {
  if (kind === 'hero') return <div className="command-panel-skeleton command-panel-skeleton--hero" aria-hidden="true"><div><Block kind="heading" /><Block kind="title" /><Block /><Block /></div><div><Block /><Block kind="title" /><Block kind="button" /></div></div>;
  return <div className={`command-panel-skeleton command-panel-skeleton--${kind}`} aria-hidden="true">
    <Block kind="heading" />
    {kind === 'roadmap' ? <div className="command-skeleton-steps">{Array.from({ length: 5 }, (_, index) => <div key={index}><Block kind="circle" /><Block /></div>)}</div>

      : kind === 'results' || kind === 'performance' ? <div className="command-skeleton-cards">{Array.from({ length: 4 }, (_, index) => <Block kind="card" key={index} />)}</div>
      : Array.from({ length: kind === 'standings' ? 5 : kind === 'schedule' ? 4 : 3 }, (_, index) => <Block kind="row" key={index} />)}
  </div>;
}

export function TournamentCommandSkeleton() {
  return <div className="tournament-command command-loading" role="status" aria-label="Turnir mərkəzi yüklənir" aria-busy="true">
    <div className="command-header" aria-hidden="true"><Block /><Block kind="title" /><Block /></div>
    <div className="command-skeleton-toolbar" aria-hidden="true"><Block kind="button" /><Block /></div>
    <div className="command-dashboard">{(['hero', 'roadmap', 'schedule', 'room', 'standings', 'performance', 'results', 'scoring', 'rules'] as const).map(kind => <section key={kind} className="command-section" data-panel={kind}><CommandPanelSkeleton kind={kind} /></section>)}</div>
  </div>;
}
