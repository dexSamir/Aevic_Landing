import {
  BadgeCheck,
  Crown,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { publicImageUrl } from '../../utils/mediaUrl';
import { services } from '../../services';
import type { Organization, Team, VerificationLevel } from '../../types/domain';
import { FileUpload, TeamLogo, Toast, Tooltip } from '../common/primitives';
export { SocialLinks as SocialLinkList, SocialIconButton, isSafeSocialUrl, officialPlatformSocialLinks } from '../social/SocialLinks';

export const verificationConfig: Record<VerificationLevel, { label: string; detail: string; icon: typeof ShieldCheck }> = {
  registered: { label: 'Qeydiyyatdan keçib', detail: 'AEVIC-də qeydiyyatdan keçmiş kimlik', icon: ShieldCheck },
  approved: { label: 'Təsdiqlənmiş komanda', detail: 'Turnir iştirakı üçün təsdiqlənmiş kimlik', icon: BadgeCheck },
  verified: { label: 'Təsdiqlənmiş komanda', detail: 'AEVIC tərəfindən yoxlanmış rəsmi kimlik', icon: Crown },
  legacy: { label: 'İrs komandası', detail: 'AEVIC rəqabət irsində seçilən kimlik', icon: Crown },
};


export function VerificationCrest({ level = 'registered', showLabel = false }: { level?: VerificationLevel; showLabel?: boolean }) {
  const config = verificationConfig[level];
  const Icon = config.icon;
  return <Tooltip label={`${config.label}: ${config.detail}`}><span className={`verification-crest verification-crest--${level}`} aria-label={`${config.label}: ${config.detail}`} tabIndex={0}><Icon size={16} strokeWidth={1.8} />{showLabel && <span>{config.label}</span>}</span></Tooltip>;
}

export function OrganizationBanner({ organization, children }: { organization: Organization; children?: React.ReactNode }) {
  const banner = publicImageUrl(organization.bannerUrl);
  return <section className={`profile-banner ${banner ? 'profile-banner--image' : 'profile-banner--fallback'}`}>
    {banner && <img src={banner} alt={organization.bannerAlt ?? `${organization.name} banneri`} />}
    <div className="profile-banner__shade" aria-hidden="true" />
    {children}
  </section>;
}

export function OrganizationIdentity({ organization }: { organization: Organization }) {
  return <div className="organization-identity">
    <TeamLogo name={organization.name} src={organization.logoUrl} size="lg" />
    <div><span>{organization.shortName} · Esports organization</span><h1>{organization.name} <VerificationCrest level={organization.verificationLevel} /></h1><p>{organization.country} · {new Date(organization.foundedAt).getFullYear()} tarixində qurulub</p></div>
  </div>;
}

export function TeamOrganizationLink({ team, organization }: { team: Team; organization?: Organization }) {
  if (!organization || team.organizationRelationship !== 'owned') return <p className="team-organization-link team-organization-link--independent">Müstəqil PUBG Mobile komandası</p>;
  return <Link className="team-organization-link" to={`/organizations/${organization.slug}`}><TeamLogo name={organization.name} src={organization.logoUrl} size="sm" /><span>Təşkilat</span><strong>{organization.name}</strong></Link>;
}

function BrandBannerUploader({ ownerType, ownerId, currentUrl }: { ownerType: 'team' | 'organization'; ownerId: string; currentUrl?: string }) {
  const [preview, setPreview] = useState(publicImageUrl(currentUrl));
  const [warning, setWarning] = useState('');
  const [fileName, setFileName] = useState('');
  const [renderMode, setRenderMode] = useState<'cover' | 'contain'>('cover');
  const validated = useRef(new WeakMap<File, { renderMode: 'cover' | 'contain'; warning: string }>());
  useEffect(() => () => { if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => { setPreview(publicImageUrl(currentUrl)); setFileName(''); setWarning(''); }, [ownerId, currentUrl]);
  const validateBanner = async (file: File) => {
    let bitmap: ImageBitmap | undefined;
    try {
      bitmap = await createImageBitmap(file);
      if (bitmap.width < 960 || bitmap.height < 300) return 'Banner ən azı 960 × 300 piksel olmalıdır.';
      const result = await services.media.validateBrandAsset({ ownerType, ownerId, assetType: 'banner', fileName: file.name, mimeType: file.type, sizeBytes: file.size, width: bitmap.width, height: bitmap.height });
      if (!result.ok) return 'Banner tələblərə uyğun deyil. Başqa şəkil seçin.';
      validated.current.set(file, { renderMode: result.renderMode ?? 'cover', warning: result.warning ?? '' });
      return undefined;
    } catch { return 'Şəkil yoxlanılmadı. Zədələnməmiş PNG, JPG və ya WebP faylı seçin.'; }
    finally { bitmap?.close(); }
  };
  const select = (file: File) => {
    const result = validated.current.get(file);
    if (!result) return;
    setRenderMode(result.renderMode); setWarning(result.warning);
    setPreview(URL.createObjectURL(file)); setFileName(file.name);
  };
  return <div className="banner-uploader"><div className={'banner-uploader__preview banner-uploader__preview--' + renderMode}>{preview ? <img src={preview} alt="Bannerin lokal önbaxışı" /> : <span>Banner seçilməyib</span>}<i aria-hidden="true" /><b>Masaüstü təhlükəsiz sahə</b><small>Mobil görünüş mərkəzi 60% sahəni saxlayır</small></div><FileUpload key={ownerId} label={ownerType === 'team' ? 'Komanda bannerini seç' : 'Təşkilat bannerini seç'} hint="1600 × 500 tövsiyə olunur · minimum 960 × 300 · PNG, JPG və ya WebP · max 6 MB" maxBytes={6_000_000} validators={[validateBanner]} onFile={select} />{warning && <p className="banner-uploader__status banner-uploader__status--warning" role="status">{warning}</p>}{fileName && <Toast title="Önbaxış hazırdır" body={fileName + ' yalnız bu cihazda göstərilir; serverə yüklənməyib.'} onClose={() => setFileName('')} />}</div>;
}

export function TeamBannerUploader({ team }: { team: Team }) {
  return <BrandBannerUploader ownerType="team" ownerId={team.id} currentUrl={team.bannerUrl} />;
}

export function OrganizationBannerUploader({ organization }: { organization: Organization }) {
  return <BrandBannerUploader ownerType="organization" ownerId={organization.id} currentUrl={organization.bannerUrl} />;
}
