import '../styles/public-pages.css';
import { PageHeader } from '../components/common/primitives';
export function RegulationsPage() {
  const sections = [
    ['İştirak şərtləri', 'İştirak uyğunluğu, heyət tələbləri və qadağalar hər turnirin təsdiqlənmiş şərtlərində göstərilməlidir.'],
    ['Heyət və UID', 'Heyət qeydiyyatın son tarixində kilidlənir. Dəyişiklik yalnız göstərilən vaxtdan əvvəl və yoxlanıla bilən sorğu ilə mümkündür.'],
    ['Check-in', 'Check-in açıq olduqda komanda hazır olduğunu təsdiqləyir. Gecikmə ilə bağlı qərar turnirin dərc edilmiş qaydalarından asılıdır.'],
    ['Otaq məlumatları', 'Otaq ID-si və şifrə yalnız uyğun komandalara təyin edilmiş açılış vaxtında göstərilir. İctimai paylaşım qadağandır.'],
    ['Xal sistemi', 'Yer və kill xalları turnir formulu ilə hesablanır; cərimə ayrıca göstərilir və yekun xaldan çıxılır.'],
    ['Ədalətli oyun', 'İcazəsiz proqram, razılaşdırılmış oyun, hesab paylaşımı və nəticəyə təsir edən digər pozuntular yoxlama və qadağa ilə nəticələnə bilər.'],
    ['Etirazlar', 'Nəticə etirazı admin mesajında göstərilən müddətdə raund, komanda və sübut istinadı ilə verilməlidir.'],
  ];
  return <section className="page-section regulations-page"><div className="container regulations-layout"><PageHeader title="Turnir reqlamenti" description="İlkin yarış bələdçisidir, yekun reqlament deyil. Hər turnirin təsdiqlənmiş şərtləri ayrıca dərc olunmalıdır." /><aside><span>AEVIC YARIŞ BƏLƏDÇİSİ</span><strong>İlkin izah</strong><p>Yekun hüquqi və yarış təsdiqi gözlənilir.</p><nav>{sections.map(([title], index) => <a key={title} href={`#rule-${index + 1}`}>{String(index + 1).padStart(2, '0')} {title}</a>)}</nav></aside><article><p className="regulations-disclosure">Bu mətn ilkin məlumat bələdçisidir; dərc olunacaq qaydalar hüquqi və yarış üzrə təsdiq tələb edir.</p>{sections.map(([title, body], index) => <section id={`rule-${index + 1}`} key={title}><span>{String(index + 1).padStart(2, '0')}</span><div><h2>{title}</h2><p>{body}</p>{index === 4 && <ul><li>Nümunə: WWCD üçün 10 yerləşmə xalı</li><li>Nümunə: hər kill üçün 1 xal</li><li>Bərabərlik meyarı turnirin təsdiqlənmiş formulunda göstərilməlidir</li></ul>}</div></section>)}</article></div></section>;
}

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
