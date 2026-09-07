import './placement-scoring.css';

/** Two reading columns preserve the complete placement formula without card tiles. */
export function PlacementScoring({ placements }: { placements: { placement: number; points: number }[] }) {
  const midpoint = Math.ceil(placements.length / 2);
  const groups = [placements.slice(0, midpoint), placements.slice(midpoint)].filter((group) => group.length);
  return <div className="placement-scoring">{groups.map((group) => <table key={group[0].placement}>
    <caption>Yer xalları · #{group[0].placement}–#{group[group.length - 1].placement}</caption>
    <thead><tr><th scope="col">YER</th><th scope="col">XAL</th></tr></thead>
    <tbody>{group.map(({ placement, points }) => <tr key={placement} className={placement <= 3 ? 'is-podium' : undefined}><th scope="row">#{placement}</th><td>{points}</td></tr>)}</tbody>
  </table>)}</div>;
}
