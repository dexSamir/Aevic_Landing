import { lazy, Suspense, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ExternalLink, BadgeCheck, Image, Link2, Users, Eye, ShieldCheck } from 'lucide-react';
import { Button, Input, LoadingSkeleton, PageHeader, Textarea, Toast, TeamLogo } from '../components/common/primitives';
import { PublicTeamIdentity } from '../components/profile/PublicTeamIdentity';
import { isSafeSocialUrl } from '../components/social/SocialLinks';
import { useTeamPlatformData } from '../services/PlatformDataContext';
import { services } from '../services';
import { invalidateQuery, updateCachedQuery } from '../services/queryCache';
import '../styles/team-profile-studio.css';
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
    try { const updated = await services.teams.updateSocialLinks(currentTeam.id, social); setSocial(updated.socialLinks ?? {}); updateCachedQuery<TeamPlatformSnapshot>('snapshot:team', value => ({ ...value, currentTeam: { ...value.currentTeam, socialLinks: updated.socialLinks } })); setSocialDirty(false); setNotice('Sosial linklər saxlanıldı.'); invalidateQuery('snapshot:public'); invalidateQuery('profile:'); }
    catch { setError('Sosial linklər saxlanılmadı. Dəyişiklikləriniz formadadır.'); }
    finally { setSaving(false); }
  };
  const saveIdentity = async () => {
    if(identitySaving)return;setIdentitySaving(true);setIdentityError('');setIdentityNotice('');
    try {
      const {name,tag,description,country,foundedAt,bannerAlt}=draft;
      const team=await services.teams.updateProfile(currentTeam.id,{name,tag,description:description??'',country,foundedAt:foundedAt?.slice(0,10),bannerAlt});
      setDraft(team);setIdentityDirty(false);updateCachedQuery<TeamPlatformSnapshot>('snapshot:team',v=>({...v,currentTeam:team}));invalidateQuery('profile:');invalidateQuery('snapshot:public');setIdentityNotice('Komanda profili saxlanıldı.');
    }catch{setIdentityError('Profil saxlanılmadı. Dəyişiklikləriniz formadadır.');}finally{setIdentitySaving(false);}
  };
  return <div className="team-profile-studio"><PageHeader eyebrow="KOMANDA / İDARƏETMƏ" title="Komanda profili" description="Komandanızın kimliyini formalaşdırın. Dəyişiklikləri canlı önbaxışda izləyin." actions={<Link className="button button--secondary" to={profilePath}>Public profili aç <ExternalLink size={17} /></Link>} />
    <section className="profile-studio-summary" aria-label="Cari komanda"><div><TeamLogo name={currentTeam.name} src={currentTeam.logoUrl} size="lg"/><span><strong>{currentTeam.name}</strong><small>{[currentTeam.tag,currentTeam.country].filter(Boolean).join(' · ') || 'Komanda kimliyi'}</small></span></div><dl><div><dt>Heyət</dt><dd>{currentTeam.roster.length} oyunçu</dd></div><div><dt>Sosial keçidlər</dt><dd>{Object.values(currentTeam.socialLinks ?? {}).filter(Boolean).length}</dd></div></dl><Link to={profilePath}>İctimai profil <ExternalLink size={16}/></Link></section>
    <nav className="profile-studio-index" aria-label="Profil redaktoru"><a href="#profile-identity"><BadgeCheck size={17}/>Kimlik</a><a href="#profile-media"><Image size={17}/>Media</a><a href="#profile-social"><Link2 size={17}/>Sosial</a><a href="#profile-roster"><Users size={17}/>Heyət</a></nav>
    <div className="team-profile-workspace">
      <div className="team-profile-controls">
        <section id="profile-identity" className="settings-panel"><header><BadgeCheck aria-hidden="true"/><div><span>01 / KOMANDA KİMLİYİ</span><h2>Komanda təqdimatı</h2><p>Komandanızın ictimai kimliyini yeniləyin və dəyişiklikləri saxlayın.</p></div></header><div className="settings-section">
          <div className="form-grid"><Input label="Komanda adı" value={draft.name} onChange={event => { setIdentityDirty(true); setDraft(value => ({ ...value, name: event.target.value })); }} /><Input label="Qısa teq" value={draft.tag ?? ''} maxLength={12} onChange={event => { setIdentityDirty(true); setDraft(value => ({ ...value, tag: event.target.value })); }} /></div>
          <div className="form-grid"><Input label="Ölkə" value={draft.country ?? ''} onChange={event => { setIdentityDirty(true); setDraft(value => ({ ...value, country: event.target.value })); }} /><Input label="Qurulduğu tarix" type="date" value={draft.foundedAt?.slice(0, 10) ?? ''} onChange={event => { setIdentityDirty(true); setDraft(value => ({ ...value, foundedAt: event.target.value || undefined })); }} /></div>
          <Textarea label="Komanda haqqında" value={draft.description ?? ''} rows={4} onChange={event => { setIdentityDirty(true); setDraft(value => ({ ...value, description: event.target.value })); }} />
          <Input label="Banner təsviri" value={draft.bannerAlt ?? ''} onChange={event => { setIdentityDirty(true); setDraft(value => ({ ...value, bannerAlt: event.target.value })); }} />

        </div>{identityError && <p className="field__error" role="alert">{identityError}</p>}{identityNotice && <p role="status">{identityNotice}</p>}<footer className="settings-savebar"><span>{identityDirty?'Saxlanılmamış dəyişikliklər':'Cari komanda kimliyi'}</span><Button loading={identitySaving} disabled={!identityDirty || draft.name.trim().length<2} onClick={()=>void saveIdentity()}>Profili saxla</Button></footer></section>
        <section id="profile-media" className="settings-panel profile-studio-media"><header><Image aria-hidden="true"/><div><span>02 / VİZUAL KİMLİK</span><h2>Loqo və banner</h2><p>Komandanızı tanıdan vizuallar. Mövcud şəkillərinizi təhlükəsiz yeniləyin.</p></div></header><div className="settings-section"><div className="profile-media-samples"><div><TeamLogo name={draft.name} src={draft.logoUrl} size="lg"/><span>Komanda loqosu<small>1:1 · PNG, JPG, WebP</small></span></div><div>{draft.bannerUrl ? <img src={draft.bannerUrl} alt={draft.bannerAlt || 'Komanda bannerinin önbaxışı'}/> : <Image size={32} aria-hidden="true"/>}<span>Profil banneri<small>1600 × 500 px</small></span></div></div>          <Button variant="secondary" onClick={() => setShowMedia(true)} disabled={showMedia} aria-expanded={showMedia}>{showMedia ? 'Media seçimləri açıqdır' : 'Loqo və banneri idarə et'}</Button>
          {showMedia && <Suspense fallback={<LoadingSkeleton variant="media"/>}><MediaPreview teamId={currentTeam.id} onPreview={(type, url) => setDraft(value => ({ ...value, [type === 'logo' ? 'logoUrl' : 'bannerUrl']: url }))} /></Suspense>}</div></section>
        <form id="profile-social" className="settings-panel" onSubmit={saveSocial}><header><Link2 aria-hidden="true"/><div><span>03 / DƏRC EDİLƏN KEÇİDLƏR</span><h2>Sosial linklər</h2><p>Komandanızın rəsmi hesablarını HTTPS keçidləri ilə əlavə edin.</p></div></header><div className="settings-section">{(['instagram', 'youtube', 'x', 'discord', 'tiktok', 'website'] as const).map(key => <Input key={key} label={{ instagram: 'Instagram', youtube: 'YouTube', x: 'X', discord: 'Discord', tiktok: 'TikTok', website: 'Veb sayt' }[key]} type="url" value={social[key] ?? ''} onChange={event => { setSocial(value => ({ ...value, [key]: event.target.value.trim() })); setSocialDirty(true); }} optional />)}</div>{error && <p className="field__error" role="alert">{error}</p>}{notice && <Toast title={notice} onClose={() => setNotice('')} />}<footer className="settings-savebar"><span>{socialDirty ? 'Saxlanılmamış sosial linklər' : 'Cari sosial linklər'}</span><Button type="submit" loading={saving} disabled={!socialDirty}>Sosial linkləri saxla</Button></footer></form>
        <section id="profile-roster" className="settings-panel"><header><Users aria-hidden="true"/><div><span>04 / HEYƏT VƏ SƏLAHİYYƏT</span><h2>İctimai heyət</h2><p>Kapitan ləqəbi və oyunçu rolları təsdiqlənmiş heyətdən göstərilir. Şəxsi hesab məlumatları public profilə çıxmır.</p></div></header><div className="settings-menu-rows"><Link to="/team/roster"><span><strong>Heyəti idarə et</strong><small>Kapitan, əsas heyət və əvəzedicilər</small></span><ArrowRight size={18} /></Link><Link to="/team/settings/managers"><span><strong>Menecerlər və sahiblik</strong><small>{currentTeam.organizationRelationship === 'owned' ? 'Təşkilata bağlı komanda' : currentTeam.organizationRelationship === 'invitation-pending' ? 'Təşkilat dəvəti gözlənilir' : 'Müstəqil komanda'}</small></span><ArrowRight size={18} /></Link><Link to="/team/invitations"><span>Təşkilat və komanda dəvətləri</span><ArrowRight size={18} /></Link></div></section>
      </div>
      <aside className="team-profile-preview" aria-label="Public profilin lokal önbaxışı"><header><span><Eye size={16}/> CANLI ÖNBAXIŞ</span><small>{identityDirty?'Saxlanılmamış önbaxış':'Cari profil'}</small></header><PublicTeamIdentity team={{ ...draft, socialLinks: social }} details={{ ...draft, socialLinks: social }} preview /><div className="team-profile-preview__roster"><span>AKTİV HEYƏT</span>{draft.roster.map(player => <p key={player.id}><strong>{player.ign}</strong><span>{player.role === 'captain' ? 'Kapitan' : player.role === 'starter' ? 'Əsas heyət' : 'Əvəzedici'}</span></p>)}</div><footer><ShieldCheck size={18} aria-hidden="true"/>Rəsmi nəticələr, sıralamalar və karyera göstəriciləri yarış nəticələrindən hesablanır; burada dəyişdirilə bilməz.</footer></aside>
    </div>
  </div>;
}
