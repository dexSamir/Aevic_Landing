import { lazy, Suspense, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { Button, Input, PageHeader, Textarea, Toast } from '../components/common/primitives';
import { PublicTeamIdentity } from '../components/profile/PublicTeamIdentity';
import { isSafeSocialUrl } from '../components/social/SocialLinks';
import { useTeamPlatformData } from '../services/PlatformDataContext';
import { demoMode, services } from '../services';
import { invalidateQuery, updateCachedQuery } from '../services/queryCache';
import type { SocialLinks, TeamPlatformSnapshot } from '../types/domain';

const MediaPreview = lazy(() => import('../components/team/TeamMediaPreview'));
export function TeamProfilePage() {
  const { currentTeam } = useTeamPlatformData();
  const [draft, setDraft] = useState(currentTeam);
  const [social, setSocial] = useState<SocialLinks>(currentTeam.socialLinks ?? {});
  const [socialDirty, setSocialDirty] = useState(false);
  const [identityDirty, setIdentityDirty] = useState(false);
  const [identitySaving, setIdentitySaving] = useState(false);
  const [identityError, setIdentityError] = useState('');
  const [identityNotice, setIdentityNotice] = useState('');
  const [showMedia, setShowMedia] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const profilePath = `/teams/${encodeURIComponent(currentTeam.slug ?? currentTeam.id)}`;
  const saveSocial = async (event: FormEvent) => {
    event.preventDefault(); if (saving) return;
    if (Object.values(social).some(url => url && !isSafeSocialUrl(url))) { setError('Yalnız təhlükəsiz https:// keçidləri daxil edin.'); return; }
    setSaving(true); setError(''); setNotice('');
    try { const updated = await services.teams.updateSocialLinks(currentTeam.id, social); setSocial(updated.socialLinks ?? {}); updateCachedQuery<TeamPlatformSnapshot>('snapshot:team', value => ({ ...value, currentTeam: { ...value.currentTeam, socialLinks: updated.socialLinks } })); setSocialDirty(false); setNotice(demoMode ? 'Sosial linklər nümunə sessiyasında saxlanıldı.' : 'Sosial linklər saxlanıldı.'); invalidateQuery('snapshot:public'); invalidateQuery('profile:'); }
    catch { setError('Sosial linklər saxlanılmadı. Dəyişiklikləriniz formadadır.'); }
    finally { setSaving(false); }
  };
  const saveIdentity = async () => {
    if(identitySaving)return;setIdentitySaving(true);setIdentityError('');setIdentityNotice('');
    try {
      const {name,tag,description,country,foundedAt,bannerAlt}=draft;
      const team=await services.teams.updateProfile(currentTeam.id,{name,tag,description:description??'',country,foundedAt:foundedAt?.slice(0,10),bannerAlt});
      setDraft(team);setIdentityDirty(false);updateCachedQuery<TeamPlatformSnapshot>('snapshot:team',v=>({...v,currentTeam:team}));invalidateQuery('profile:');invalidateQuery('snapshot:public');setIdentityNotice(demoMode?'Kimlik nümunə sessiyasında saxlanıldı.':'Komanda profili saxlanıldı.');
    }catch{setIdentityError('Profil saxlanılmadı. Dəyişiklikləriniz formadadır.');}finally{setIdentitySaving(false);}
  };
  return <><PageHeader eyebrow="// KOMANDANIN İCTİMAİ ÜZÜ" title="Public profil" description="Tamaşaçıların gördüyü kimlik, heyət və sosial keçidlər." actions={<Link className="button button--secondary" to={profilePath}>Public profili aç <ExternalLink size={17} /></Link>} />
    <div className="team-profile-workspace">
      <div className="team-profile-controls">
        <section className="settings-panel"><header><div><span>KOMANDA KİMLİYİ</span><h2>Komanda təqdimatı</h2><p>Komandanızın ictimai kimliyini yeniləyin və dəyişiklikləri saxlayın.</p></div></header><div className="settings-section">
          <div className="form-grid"><Input label="Komanda adı" value={draft.name} onChange={event => { setIdentityDirty(true); setDraft(value => ({ ...value, name: event.target.value })); }} /><Input label="Qısa teq" value={draft.tag ?? ''} maxLength={12} onChange={event => { setIdentityDirty(true); setDraft(value => ({ ...value, tag: event.target.value })); }} /></div>
          <div className="form-grid"><Input label="Ölkə" value={draft.country ?? ''} onChange={event => { setIdentityDirty(true); setDraft(value => ({ ...value, country: event.target.value })); }} /><Input label="Qurulduğu tarix" type="date" value={draft.foundedAt?.slice(0, 10) ?? ''} onChange={event => { setIdentityDirty(true); setDraft(value => ({ ...value, foundedAt: event.target.value || undefined })); }} /></div>
          <Textarea label="Komanda haqqında" value={draft.description ?? ''} rows={4} onChange={event => { setIdentityDirty(true); setDraft(value => ({ ...value, description: event.target.value })); }} />
          <Input label="Banner təsviri" value={draft.bannerAlt ?? ''} onChange={event => { setIdentityDirty(true); setDraft(value => ({ ...value, bannerAlt: event.target.value })); }} />
          <Button variant="secondary" onClick={() => setShowMedia(true)} disabled={showMedia} aria-expanded={showMedia}>{showMedia ? 'Media seçimləri açıqdır' : 'Logo və banneri idarə et'}</Button>
          {showMedia && <Suspense fallback={<p>Media seçimləri açılır…</p>}><MediaPreview teamId={currentTeam.id} onPreview={(type, url) => setDraft(value => ({ ...value, [type === 'logo' ? 'logoUrl' : 'bannerUrl']: url }))} /></Suspense>}
        </div>{identityError && <p className="field__error" role="alert">{identityError}</p>}{identityNotice && <p role="status">{identityNotice}</p>}<footer className="settings-savebar"><span>{identityDirty?'Saxlanılmamış dəyişikliklər':'Cari komanda kimliyi'}</span><Button loading={identitySaving} disabled={!identityDirty || draft.name.trim().length<2} onClick={()=>void saveIdentity()}>Profili saxla</Button></footer></section>
        <form className="settings-panel" onSubmit={saveSocial}><header><div><span>DƏRC EDİLƏN KEÇİDLƏR</span><h2>Sosial linklər</h2><p>Saxladığınız keçidlər public profildə görünür.</p></div></header><div className="settings-section">{(['instagram', 'youtube', 'x', 'discord', 'tiktok', 'website'] as const).map(key => <Input key={key} label={{ instagram: 'Instagram', youtube: 'YouTube', x: 'X', discord: 'Discord', tiktok: 'TikTok', website: 'Veb sayt' }[key]} type="url" value={social[key] ?? ''} onChange={event => { setSocial(value => ({ ...value, [key]: event.target.value.trim() })); setSocialDirty(true); }} optional />)}</div>{error && <p className="field__error" role="alert">{error}</p>}{notice && <Toast title={notice} onClose={() => setNotice('')} />}<footer className="settings-savebar"><span>{socialDirty ? 'Saxlanılmamış sosial linklər' : 'Cari sosial linklər'}</span><Button type="submit" loading={saving} disabled={!socialDirty}>Sosial linkləri saxla</Button></footer></form>
        <section className="settings-panel"><header><div><span>HEYƏT VƏ SƏLAHİYYƏT</span><h2>İctimai heyət</h2><p>Kapitan ləqəbi və oyunçu rolları təsdiqlənmiş heyətdən göstərilir. Şəxsi hesab məlumatları public profilə çıxmır.</p></div></header><div className="settings-menu-rows"><Link to="/team/roster"><span><strong>Heyəti idarə et</strong><small>Kapitan, əsas heyət və əvəzedicilər</small></span><ArrowRight size={18} /></Link><Link to="/team/settings/managers"><span><strong>Menecerlər və sahiblik</strong><small>{currentTeam.organizationRelationship === 'owned' ? 'Təşkilata bağlı komanda' : currentTeam.organizationRelationship === 'invitation-pending' ? 'Təşkilat dəvəti gözlənilir' : 'Müstəqil komanda'}</small></span><ArrowRight size={18} /></Link><Link to="/team/invitations"><span>Təşkilat və komanda dəvətləri</span><ArrowRight size={18} /></Link></div></section>
      </div>
      <aside className="team-profile-preview" aria-label="Public profilin lokal önbaxışı"><header><span>CANLI ÖNBAXIŞ</span><small>{identityDirty?'Saxlanılmamış önbaxış':'Cari profil'}</small></header><PublicTeamIdentity team={{ ...draft, socialLinks: social }} details={{ ...draft, socialLinks: social }} preview /><div className="team-profile-preview__roster"><span>AKTİV HEYƏT</span>{draft.roster.map(player => <p key={player.id}><strong>{player.ign}</strong><span>{player.role === 'captain' ? 'Kapitan' : player.role === 'starter' ? 'Əsas heyət' : 'Əvəzedici'}</span></p>)}</div><footer>Rəsmi nəticələr, sıralamalar və karyera göstəriciləri yarış nəticələrindən hesablanır; burada dəyişdirilə bilməz.</footer></aside>
    </div>
  </>;
}
