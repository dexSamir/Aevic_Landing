import { Link } from 'react-router-dom';
import '../styles/regulations.css';
import '../styles/public-pages.css';
import { PageHeader } from '../components/common/primitives';
export { RegulationsPage } from './RegulationsPage';

function InformationPage({ title, description, sections }: { title: string; description: string; sections: [string, string][] }) {
  return <section className="page-section information-page"><div className="container"><PageHeader title={title} description={description} /><div className="information-page__body">{sections.map(([heading, body]) => <section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}</div></div></section>;
}

export function PrivacyPage() {
  return <InformationPage title="Məxfilik məlumatı" description="İctimai buraxılışın texniki məlumat sərhədləri. Bu mətn yekun hüquqi məxfilik siyasəti deyil." sections={[
    ["İctimai məlumat", "Sayt təsdiqlənmiş komanda kimliklərini göstərmək üçün serverdən ictimai məlumat oxuyur. İctimai cavabda kapitan əlaqələri, oyunçu UID-ləri və hesab sirləri göstərilmir."],
    ["Hesab xidmətləri", "Hesab girişi və qeydiyyat Supabase Auth vasitəsilə işləyir. Şəxsi əməliyyatlar üçün təsdiqlənmiş hesab və uyğun səlahiyyət tələb olunur."],
    ["Brauzerdə saxlanma", "Brauzer ictimai statik faylları və interfeys seçimlərini lokal saxlaya bilər. Şəxsi səhifələr və API cavabları oflayn keşə yazılmır."],
    ["Hüquqi təsdiq", "Məlumat məsulu, saxlama müddətləri, istifadəçi hüquqları və rəsmi müraciət kanalı buraxılış sahibinin hüquqi təsdiqini tələb edir. Bu xarici təsdiq tamamlanmayıb."]
  ]} />;
}

export function TermsPage() {
  return <InformationPage title="İstifadə şərtləri" description="Platformadan istifadə və yarış iştirakına aid yekun şərtlər hüquqi təsdiq gözləyir." sections={[
    ["Hazırkı əhatə", "Bu buraxılış ictimai yarış bələdçisini və təsdiqlənmiş komanda kataloqunu təqdim edir. Hesab və yarışa qeydiyyat əməliyyatları server qaydalarına və turnir vaxtlarına tabedir."],
    ["Turnir qaydaları", "Hər turnirin iştirak, ədalətli oyun, heyət və xal şərtləri ayrıca təsdiqlənərək dərc olunmalıdır. İlkin bələdçi yekun turnir qərarını əvəz etmir."],
    ["Status", "Bu səhifə ilkin məlumat üçündür və yekun hüquqi sənəd hesab edilmir."]
  ]} />;
}

export function ContactPage() {
  return <InformationPage title="Əlaqə" description="Hazırkı ictimai buraxılışın əlaqə və dəstək imkanları." sections={[
    ["Yarış əməliyyatları", "Hesabınızdakı dəstək bölməsindən sorğu göndərə və cavabları izləyə bilərsiniz."],
    ["Komanda dəstəyi", "Komanda təsdiqi və heyət sorğuları komanda iş sahəsindən izlənilir."],
    ["Rəsmi əlaqə", "Təsdiqlənmiş sosial kanallar konfiqurasiya edildikdə səhifənin aşağı hissəsində görünür. Heç bir keçid göstərilmirsə, əlaqə kanalı bu buraxılışda hələ dərc edilməyib."]
  ]} />;
}
