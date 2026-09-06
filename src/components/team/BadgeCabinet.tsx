import { ArrowDown, ArrowUp, Check, GripVertical, LockKeyhole, Save, X } from 'lucide-react';
import { type PointerEvent, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AchievementCategory, AchievementTier, TeamAchievement } from '../../types/domain';
import { services } from '../../services';
import { Button, Modal, Tabs, Toast } from '../common/primitives';
import { AchievementMedal } from './Achievements';

export function FeaturedBadgeCabinet({ achievements, onViewAll }: { achievements: TeamAchievement[]; onViewAll?: () => void }) {
  const featured = achievements.filter((item) => item.state === 'unlocked').sort((a, b) => a.displayOrder - b.displayOrder).slice(0, 3);
  return <section className="featured-cabinet" aria-label="Seçilmiş üç komanda nişanı">
    <header><div><span>Badge Cabinet</span><h2>Seçilmiş insigniyalar</h2></div>{onViewAll && <Button variant="ghost" onClick={onViewAll}>Bütün nişanlara bax</Button>}</header>
    <div className="featured-cabinet__rail">{featured.map((achievement, index) => <AchievementMedal key={achievement.id} achievement={achievement} featured rank={index + 1} />)}</div>
  </section>;
}

export function BadgeDetails({ achievement }: { achievement: TeamAchievement }) {
  return <div className="badge-details"><AchievementMedal achievement={achievement} featured /><dl><div><dt>Kateqoriya</dt><dd>{achievement.category}</dd></div><div><dt>Tier</dt><dd>{achievement.tier}</dd></div><div><dt>Rarity</dt><dd>{achievement.rarity}</dd></div>{achievement.unlockedAt && <div><dt>Qazanılıb</dt><dd>{new Date(achievement.unlockedAt).toLocaleDateString('az-AZ')}</dd></div>}</dl></div>;
}

export function BadgeCollectionDrawer({ open, achievements, onClose }: { open: boolean; achievements: TeamAchievement[]; onClose: () => void }) {
  const [filter, setFilter] = useState('all');
  const earned = achievements.filter((item) => item.state === 'unlocked');
  const filtered = filter === 'all' ? earned : earned.filter((item) => item.category === filter || item.tier === filter);
  const filters = ['all', ...new Set(earned.flatMap((item) => [item.category, item.tier]))];
  return <Modal open={open} title="Qazanılmış Badge Cabinet" onClose={onClose}>
    <div className="badge-collection"><Tabs active={filter} onChange={setFilter} items={filters.map((id) => ({ id, label: id === 'all' ? 'Hamısı' : id }))} /><div className="badge-collection__wall">{filtered.map((achievement) => <AchievementMedal key={achievement.id} achievement={achievement} />)}</div></div>
  </Modal>;
}

function moveItem(items: TeamAchievement[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const copy = [...items]; [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

export function BadgeReorderList({ items, onChange }: { items: TeamAchievement[]; onChange: (items: TeamAchievement[]) => void }) {
  const [dragId, setDragId] = useState<string>();
  const activeDragId = useRef<string | undefined>(undefined);
  const lastTargetId = useRef<string | undefined>(undefined);
  const beginDrag = (event: PointerEvent<HTMLButtonElement>, itemId: string) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    activeDragId.current = itemId;
    lastTargetId.current = itemId;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragId(itemId);
  };
  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const sourceId = activeDragId.current;
    if (!sourceId) return;
    event.preventDefault();
    const target = (document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null)?.closest<HTMLElement>('[data-badge-id]')?.dataset.badgeId;
    if (!target || target === lastTargetId.current) return;
    const from = items.findIndex((item) => item.id === sourceId); const to = items.findIndex((item) => item.id === target);
    if (from < 0 || to < 0 || from === to) return;
    const copy = [...items]; const [moved] = copy.splice(from, 1); copy.splice(to, 0, moved); onChange(copy); lastTargetId.current = target;
  };
  const endDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    activeDragId.current = undefined; lastTargetId.current = undefined; setDragId(undefined);
  };
  return <ol className="badge-reorder-list" aria-label="Seçilmiş nişanların sırası">{items.map((item, index) => <li key={item.id} data-badge-id={item.id} className={dragId === item.id ? 'is-dragging' : ''}><button type="button" className="badge-drag-handle" aria-label={`${item.title} nişanını pointer ilə daşı`} onPointerDown={(event) => beginDrag(event, item.id)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}><GripVertical size={18} aria-hidden="true" /></button><span>{index + 1}</span><AchievementMedal achievement={item} compact /><div className="badge-reorder-actions"><button type="button" aria-label={`${item.title} nişanını yuxarı daşı`} disabled={index === 0} onClick={() => onChange(moveItem(items, index, -1))}><ArrowUp size={17} /></button><button type="button" aria-label={`${item.title} nişanını aşağı daşı`} disabled={index === items.length - 1} onClick={() => onChange(moveItem(items, index, 1))}><ArrowDown size={17} /></button></div></li>)}</ol>;
}

export function BadgeCabinetEditor({ achievements, teamId }: { achievements: TeamAchievement[]; teamId: string }) {
  const unlocked = useMemo(() => achievements.filter((item) => item.state === 'unlocked'), [achievements]);
  const [selected, setSelected] = useState(() => unlocked.filter((item) => item.featured).sort((a, b) => a.displayOrder - b.displayOrder).slice(0, 3));
  const [saving, setSaving] = useState(false); const [notice, setNotice] = useState<'success' | 'error'>();
  const toggle = (achievement: TeamAchievement) => setSelected((items) => items.some((item) => item.id === achievement.id) ? items.filter((item) => item.id !== achievement.id) : items.length < 3 ? [...items, achievement] : items);
  const preview = selected.map((item, index) => ({ ...item, displayOrder: index + 1 }));
  const save = async () => { setSaving(true); setNotice(undefined); try { await services.achievements.saveFeatured(teamId, selected.map((item) => item.id)); setNotice('success'); } catch { setNotice('error'); } finally { setSaving(false); } };
  return <div className="badge-editor">
    {notice && <Toast tone={notice} title={notice === 'success' ? 'Badge Cabinet saxlanıldı' : 'Yadda saxlamaq mümkün olmadı'} body={notice === 'error' ? 'Yenidən cəhd edin. Production-da backend ownership yoxlaması tələb olunur.' : 'Public team profilində bu sıra göstəriləcək.'} onClose={() => setNotice(undefined)} />}
    <section className="badge-editor__picker"><header><div><span>{selected.length} / 3 seçilib</span><h2>Qazanılmış nişanlar</h2></div><p>Yalnız qazanılmış nişanlar seçilə bilər.</p></header><div>{unlocked.map((achievement) => { const active = selected.some((item) => item.id === achievement.id); return <article key={achievement.id}><button type="button" aria-pressed={active} disabled={!active && selected.length === 3} onClick={() => toggle(achievement)}><AchievementMedal achievement={achievement} compact /><span>{active ? <><Check size={16} /> Seçilib</> : <>Seç <span className="sr-only">{achievement.title}</span></>}</span></button><Link to={`/team/badges/${achievement.id}`}>{achievement.title} detalı</Link></article>; })}</div></section>
    <section className="badge-editor__order"><header><div><span>Public sıra</span><h2>Sıranı idarə et</h2></div><p>Siçanla daşıyın və ya hər elementdəki yuxarı/aşağı düymələrindən istifadə edin.</p></header>{selected.length ? <BadgeReorderList items={selected} onChange={setSelected} /> : <div className="badge-editor__empty"><LockKeyhole size={24} /><p>Preview üçün ən az bir qazanılmış nişan seçin.</p></div>}</section>
    <section className="badge-editor__preview"><FeaturedBadgeCabinet achievements={preview} /></section>
    <footer><span>Exactly three badges are shown when three are selected.</span><Button loading={saving} disabled={selected.length !== 3} icon={<Save size={17} />} onClick={save}>Cabinet-i saxla</Button></footer>
  </div>;
}

export const badgeFilterTypes: { categories: AchievementCategory[]; tiers: AchievementTier[] } = {
  categories: ['competition', 'combat', 'participation', 'consistency', 'seasonal', 'legacy', 'special'],
  tiers: ['bronze', 'silver', 'gold', 'phoenix', 'legacy'],
};
