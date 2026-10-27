import { internationalFormula } from '../utils/scoring';

export const rulebookVersion = '1.0 · 27 oktyabr 2026';
/** Original AEVIC draft. Operational commitments remain subject to owner approval. */
export const regulationSections: Array<{ title: string; paragraphs: string[] }> = [
  { title: 'A — Platformadan istifadə', paragraphs: [
    'AEVIC komanda kimliklərini, turnir iştirakını və təsdiqlənmiş yarış nəticələrini birləşdirir. Hesab yaratmaq turnirə qəbul və ya mükafat hüququ vermir. İştirakçı həm platformanın dərc olunmuş şərtlərinə, həm də seçdiyi turnirin reqlamentinə əməl edir.',
    'Qeydiyyat məlumatları doğru və aktual olmalıdır. Hesab sahibi e-poçtuna çıxışı, şifrəsini və bərpa kodlarını qoruyur; giriş məlumatlarını paylaşmır. Başqasının adından hesab yaratmaq, rəsmiləri təqlid etmək, saxta qeydiyyat və məhdudiyyətləri çoxsaylı hesablarla aşmaq qadağandır. Hesabın və ya komandanın ötürülməsi üçün administratora yoxlanıla bilən müraciət edilməlidir.',
    'İcazəsiz giriş, zəiflikdən istifadə, giriş cəhdlərinin avtomatlaşdırılması, xidmətə yük yaradan məlumat toplama, spam, təqib və şikayət sistemindən qəsdən sui-istifadə yolverilməzdir. Təhlükəsizlik problemi aşkar etdikdə məlumatları yaymadan və digər hesablara müdaxilə etmədən dəstəyə bildirin. İctimai məzmunu saxtalaşdırmaq və başqasının materialını öz adından təqdim etmək olmaz.',
    'Administrator müraciəti və mövcud sübutları əl ilə araşdırır. Məhdudiyyətin səbəbi və əhatəsi bildirilir; istifadəçi izahat və əlavə sübut təqdim edə bilər. Təcili təhlükəsizlik halında ilkin qoruyucu məhdudiyyət tətbiq oluna bilər, lakin sonrakı baxış tələb olunur. Etiraz üçün hesabdakı dəstək sorğusundan və ya dərc edilmiş əlaqə kanalından istifadə edin.',
  ] },
  { title: 'B — Komanda qeydiyyatı və heyət', paragraphs: [
    'Komandanı yaratmağa səlahiyyəti olan kapitan ad, əlaqə məlumatları və heyəti düzgün təqdim edir. Kapitan qeydiyyatın, elanların, check-in-in, otaq məlumatlarının və heyətin vaxtında yoxlanmasına cavabdehdir. Komanda sahibliyi ilə bağlı mübahisə yalnız hesaba çıxış faktı ilə həll edilmir; administrator təqdim edilmiş sübutları yoxlayır.',
    'Hazırkı qeydiyyat dörd əsas oyunçu və bir əlavə ehtiyat oyunçu yeri nəzərdə tutur. Oyun adları faktiki iştirakçılara uyğun olmalıdır. Eyni oyunçunun eyni turnirdə bir neçə komanda adından iştirakı və təkrar qeydiyyatla əlavə slot tutmaq qadağandır. Ayrı turnirlərdə iştirak onların cədvəli və dərc edilmiş məhdudiyyətləri ilə uyğun olmalıdır.',
    'Təsdiq statusunu və son tarixləri komanda panelindən izləyin. Kapitan dəyişikliyi və mübahisəli sahiblik dəstək vasitəsilə yoxlanılır. Kilidlənmiş turnir heyətinə dəyişiklik və ehtiyat oyunçunun cəlbi əvvəlcədən administratorun təsdiqini tələb edir; profilin redaktəsi turnir heyətini avtomatik dəyişmir.',
    'Son tarixdən sonra ərizə, uyğun olmayan heyət, saxta məlumat və ya icazəsiz oyunçu qəbuldan imtina və araşdırmadan sonra diskvalifikasiya ilə nəticələnə bilər. Texniki səhv və fövqəladə hal ayrıca qiymətləndirilir; avtomatik istisna yoxdur.',
  ] },
  { title: 'C — Komanda adları və oyunçu adları', paragraphs: [
    'Adlar oxunaqlı, fərqləndirilə bilən, qeydiyyat kimliyi ilə uyğun və ictimai yayım üçün münasib olmalıdır. Nifrət, ayrı-seçkilik, təhdid, açıq seksual məzmun, ağır söyüş, rəsmi şəxsin təqlidi və moderasiyadan yayınmaq üçün gizlədilmiş ifadələr qadağandır.',
    'İcazəsiz əmtəə nişanı, saxta sponsorluq və AEVIC, oyun naşiri və ya digər təşkilatla mövcud olmayan rəsmi əlaqə iddiası yolverilməzdir. Administrator əsaslandırılmış düzəliş tələb edə bilər; komanda adı və oyunçu adı panelin icazə verdiyi sahələrdə yenilənir, kilidli heyət üçün ayrıca sorğu verilir.',
    'Platformada komanda teqi könüllüdür və ən çox 5 simvoldur. Bütün oyunçulara universal teq tələbi qoyulmur. Turnir yayım üçün teq tələb edərsə, məsələn TEQ•Oyunçu formatını, son tarixi və oyunun ad məhdudiyyətlərinə uyğun alternativi əvvəlcədən dərc etməlidir.',
  ] },
  { title: 'D — Loqo, banner və şəkillər', paragraphs: [
    'Yükləyən şəxs loqo, banner, oyunçu şəkli, profil təsviri və ShareCard fonundan istifadə hüququna malik olmalıdır. Müəllif hüququ və əmtəə nişanı pozuntusu, pornoqrafiya, açıq zorakılıq, ekstremist və nifrət simvolları, rəsmi təşkilatın təqlidi, saxta brend təmsilçiliyi və zərərli və ya aldadıcı material qadağandır.',
    'Komanda loqosu, banner və oyunçu şəkli üçün PNG, JPEG/JPG və WebP qəbul edilir; hər fayl ən çox 4 000 000 bayt (4 MB) ola bilər. Server şəkli yoxlayır; animasiyalı və çoxsəhifəli fayllar, pozulmuş şəkillər və 20 milyon pikseldən böyük təsvirlər qəbul edilmir. Fayl uzantısını dəyişmək format yoxlamasını əvəz etmir.',
    'Loqo üçün 1024 × 1024 px və 1:1, banner üçün 1600 × 500 px və 16:5 tövsiyə olunur. Oyunçu şəkillərində ilkin nisbət saxlanılır. Mətn və simvollar kiçik ölçüdə seçilməli, kəsimdə vacib hissələr itirilməməlidir. ShareCard fonu üçün redaktorda göstərilən ölçünü əsas götürün.',
    'Hüquq sahibi müraciəti və ya pozuntu şübhəsi administrator tərəfindən yoxlanılır. Uyğunsuz material gizlədilə və ya silinə, əvəz edilməsi tələb oluna bilər. Komanda media bölməsindən, oyunçu şəkli isə heyət bölməsindən yenilənir. Mübahisə zamanı hüquq və icazəni təsdiqləyən məlumatı dəstəyə təqdim edin.',
  ] },
  { title: 'E — Oyunçunun iştirak uyğunluğu', paragraphs: [
    'Yaş, ölkə və region tələbləri hər turnirin elanında qeydiyyatdan əvvəl göstərilməlidir. Ümumi beynəlxalq qaydalardakı yaş və səfər şərtləri AEVIC onlayn turnirlərinə avtomatik tətbiq edilmir. Minimum yaş və yetkinlik yaşına çatmayanlar üçün razılıq qaydası təşkilatçı və hüquqi baxış tərəfindən təsdiqlənməlidir; bu layihə yeni yaş qadağası tətbiq etmir.',
    'Oyunçu öz oyun hesabından istifadə edir və qeydiyyatda göstərilən kimliklə iştirak edir. Təşkilatçı yalnız uyğunluğu yoxlamaq üçün zəruri məlumatı tələb etməli və onu ictimai paylaşmamalıdır. Ehtiyat oyunçu da eyni uyğunluq şərtlərinə tabedir.',
    'Yanlış məlumat və kimlik uyğunsuzluğu araşdırılır. Uyğunluğa etiraz edən tərəf oyunçu, turnir və faktları göstərməlidir; şəxsi məlumatları ictimai müzakirəyə çıxarmamalıdır. Administrator tərəflərin izahatını və sübutları nəzərə alır.',
  ] },
  { title: 'F — Turnirə müraciət və check-in', paragraphs: [
    'Turnirə müraciət, təsdiq edilmiş iştirak və check-in ayrı mərhələlərdir. Slot tutumu, qeydiyyatın açılış və bağlanış vaxtı, heyət kilidi və check-in pəncərəsi turnir səhifəsində və komanda panelində göstərilir. Kapitan statusu yoxlamalıdır; göndərilmiş müraciət təsdiq edilmiş iştirak kimi təqdim edilə bilməz.',
    'Check-in açıq vaxtda komandanın hazır olduğunu təsdiqləyin. Buraxılmış check-in üçün nəticə turnirin əvvəlcədən dərc etdiyi qaydaya və administrator baxışına əsaslanır. Boş slotun mövcudluğu gecikmiş komandanın avtomatik qəbuluna zəmanət deyil. Bu reqlament avtomatik gözləmə siyahısı və ya avtomatik slot əvəzlənməsi vəd etmir.',
    'Qeydiyyatdan çıxmaq üçün paneldəki mövcud imkandan istifadə edin; əməliyyat məhduddursa dəstəyə yazın. Turnirin ləğvi, təxirə salınması və cədvəl dəyişikliyi turnir elanında və mövcud bildiriş kanallarında açıqlanmalıdır. Kapitan yenilənmiş vaxtı heyətinə çatdırır.',
    'Otaq ID-si və şifrə yalnız uyğun iştirakçıya nəzərdə tutulan açılış vaxtında göstərilir. Onları ictimai paylaşmaq və üçüncü şəxsə vermək olmaz. Təyin edilmiş slot və rəsmi cədvələ əməl edin; bildiriş almamaq cədvəli yoxlamaq məsuliyyətini aradan qaldırmır.',
  ] },
  { title: 'G — Matçın keçirilməsi', paragraphs: [
    'Xəritələr və başlama vaxtları turnirin matç cədvəlində göstərilir. Komanda otağa vaxtında daxil olur, düzgün slotu seçir və təsdiqlənmiş heyətlə hazır olur. Çatışmayan oyunçu, gecikmə və giriş problemi başlanğıcdan əvvəl administratora bildirilməlidir; rəqibin slotunu tutmaq olmaz.',
    'İnternet, cihaz və oyun bağlantısının hazırlanması iştirakçının məsuliyyətidir. Bağlantının kəsilməsi avtomatik fasilə, təkrar oyun və ya əlavə xal hüququ yaratmır. Hadisənin vaxtı, matç və mümkün sübutlar təqdim edilməlidir; həssas otaq məlumatları ictimai sübuta daxil edilməməlidir.',
    'Fasilə, yenidən otaq açılması, təkrar matç və ləğv qərarını administrator oyunun imkanlarını, təsirlənmiş komandaları və rəqabət ədalətini nəzərə alaraq verir. Platforma avtomatik fasilə və təkrar matç sistemi vəd etmir. Qərar, onun səbəbi və nəticələrin saxlanılıb-saxlanılmadığı iştirakçılara açıqlanmalıdır.',
    'İcazəsiz matçı tərk etmək, qəsdən oyunu pozmaq və saxta nəticə təqdim etmək araşdırılır. Rəsmi nəticəni səlahiyyətli operator daxil edir və dərc edir; iştirakçı sübutu rəsmi dərc edilmiş nəticəni özü dəyişmir.',
  ] },
  { title: 'H — Ədalətli oyun və yarış dürüstlüyü', paragraphs: [
    'Çit, icazəsiz oyun modifikasiyası, proqram və xəta istismarı, matçın razılaşdırılması, rəqiblə sövdələşmə və qəsdən rəqibə xal qazandırmaq qadağandır. Oyun zamanı hesab paylaşımı və təsdiqlənməmiş oyunçu əvəzlənməsi də pozuntudur.',
    'Canlı yayımı və müşahidəçi məlumatını rəqabət üstünlüyü üçün istifadə etmək, stream sniping, ghosting və rəqibin məxfi məlumatına icazəsiz çıxış yolverilməzdir. Təqib, təhdid, qəsdən xidmət və matç pozuntusu, sübutların montajla təhrif edilməsi və saxta nəticə təqdimatı qadağandır.',
    'Sanksiya sübut, qəsd, təsir, əvvəlki pozuntular və yüngülləşdirici hallara uyğun seçilir: xəbərdarlıq, sübut edilmiş nəticənin düzəldilməsi, əsaslandırılmış xal cəriməsi, matç məğlubiyyəti, diskvalifikasiya, müvəqqəti məhdudiyyət və ağır və ya təkrar hallarda daimi qadağa. Cərimə ayrıca qeydə alınmalıdır; gizli xal dəyişməsi olmaz.',
    'Ağır sanksiya sadəcə şikayətə əsasən avtomatik tətbiq edilmir. Administrator sübutları yoxlayır, cavab imkanı verir və qərarın əsasını bildirir. Təhlükəsizlik üçün təcili müvəqqəti tədbir sonrakı araşdırmanı əvəz etmir. Yenidən baxış üçün yeni faktları və qərar istinadını dəstəyə təqdim edin.',
  ] },
  { title: 'I — Rəsmi xal sistemi', paragraphs: [
    'Yeni turnirlərin standartı PUBG Mobile beynəlxalq v1 presetidir. Əvvəl yaradılmış turnirin saxlanılmış formulu və sıralama qaydası qüvvədə qalır; yeni standart onun dərc edilmiş nəticələrini dəyişmir. Konkret turnirin “Xal formulu” bölməsi həmin yarışın qaydasını göstərir.',
    `Yerləşmə xalları: ${internationalFormula.placement.map(row => `${row.placement}-ci yer — ${row.points}`).join('; ')}. Hər təsdiqlənmiş eliminasiya ${internationalFormula.finishPointValue} xal verir.`,
    'Matç xalı = yerləşmə xalı + eliminasiya xalı − ayrıca qeydə alınmış cərimə. Məsələn, 2-ci yer və 7 eliminasiya cərimə yoxdursa 6 + 7 = 13 xal edir. WWCD birinci yerin sayıdır; standart presetdə əlavə qələbə bonusu yoxdur.',
    `Ümumi sıralama müvafiq turnirin dərc edilmiş matçlarının cəminə əsaslanır. Xallar bərabərdirsə ardıcıllıq belədir: ${internationalFormula.tieBreakRules.join('; ')}. Son müvafiq matçda nəticəsi olmayan komanda həmin meyarda nəticəsi olan komandadan sonra sıralanır. Bütün meyarlar bərabər qalsa sabit komanda identifikatoru üzrə texniki sıra tətbiq edilir; əlavə rəqabət xalı verilmir.`,
    'Tək matç cədvəli də həmin turnirin presetinə əsaslanır. Qaralama və dərc edilməmiş nəticə ictimai sıralamaya daxil edilmir. Düzəliş yalnız səlahiyyətli operatorun əsaslandırılmış əməliyyatından sonra görünür. PNG cədvəlləri və ShareCard nəticələri dərc edilmiş məlumatı əks etdirir.',
    'SMASH ayrıca çempionluq formatıdır və bu standartda aktiv deyil. AEVIC-də belə format yalnız tam qaydaları və texniki dəstəyi ayrıca təsdiqlənib elan edildikdən sonra istifadə oluna bilər.',
  ] },
  { title: 'J — Nəticələr, etiraz və yenidən baxış', paragraphs: [
    'Daxil edilmiş ilkin nəticə ilə rəsmi dərc edilmiş nəticə fərqlidir. Operator matç və komanda uyğunluğunu, yerləri, eliminasiyaları və cərimələri yoxlamalıdır. Dərc edilmə ictimai cədvəlin yenilənməsinə səbəb olur; sonradan əsaslandırılmış düzəliş mümkündür.',
    'Nəticəyə etirazda turnir, matç, komanda, mübahisəli göstərici və tələb edilən düzəlişi göstərin. Orijinal ekran görüntüsü, video və yoxlanıla bilən istinad təqdim edin. Saxta və ya kontekstdən çıxarılmış sübut qəbul edilmir; digər şəxslərin əlaqə və giriş məlumatlarını əlavə etməyin.',
    'Etiraz müddəti turnirdə konfiqurasiya edilmiş pəncərə və matçın göstərilən son vaxtı ilə müəyyən edilir. Bu bələdçi ayrıca universal müddət yaratmır. Vaxt göstərilmirsə təşkilatçıdan dəqiqləşdirin. Texniki maneə barədə vaxtında dəstək sorğusu göndərin.',
    'Administrator nəticə və sübutları, lazım olduqda digər tərəfin izahatını yoxlayır. Düzəlişin əsası və statusu bildirilir. Qərara etiraz və yeni sübut üçün mövcud dəstək kanalından yenidən baxış istəyin; ayrıca avtomatik apellyasiya sistemi nəzərdə tutulmur. Yekun nəticənin təsdiqi təşkilatçının elanında göstərilir.',
  ] },
  { title: 'K — Mükafat və ödəniş şərtləri', paragraphs: [
    'Mükafat yalnız həmin turnir üçün dərc edilmiş və təşkilatçı tərəfindən təsdiqlənmiş şərtlər əsasında yaranır. Məbləğ, bölgü, uyğunluq, alıcı və yoxlama tələbləri iştirakdan əvvəl açıqlanmalıdır. Cədvəldə birinci yer tutmaq elan edilməmiş pul mükafatına zəmanət deyil.',
    'Ödənişdən əvvəl nəticə, iştirak uyğunluğu və alıcının səlahiyyəti yoxlana bilər. Saxta məlumat və təsdiqlənmiş diskvalifikasiyanın mükafata təsiri əvvəlcədən dərc edilmiş şərtlərə əsaslanmalıdır; mübahisə araşdırılmadan yekun müsadirə qərarı verilməməlidir.',
    'Bu platforma universal ödəniş müddəti, ödəniş üsulu və avtomatik geri qaytarma vəd etmir. Ödənişli turnir varsa ləğv, iştirakdan çıxma və geri qaytarma şərtləri ayrıca təsdiqlənməli və ödənişdən əvvəl bildirilməlidir. Ödəniş mübahisəsində sübutlar dəstəyə təqdim edilir.',
    'Vergi və digər qanuni öhdəliklər tətbiq olunan tələblərə əsasən müəyyən edilir. Mükafat və ödəniş siyasətinin hüquqi və əməliyyat təsdiqi platforma sahibinin üzərindədir; bu layihə həmin təsdiqi əvəz etmir.',
  ] },
  { title: 'L — Yayım və media', paragraphs: [
    'Komanda adları, oyunçu adları, loqolar və yarış statistikası ictimai profildə, sıralamada və yaradılan ShareCard-larda görünə bilər. İştirakçı ictimai görünəcək materialların uyğunluğunu əvvəlcədən yoxlamalıdır.',
    'Rəsmi yayım, şəxsi yayım icazəsi və tələb edilən gecikmə hər turnir üçün ayrıca açıqlanmalıdır. Rəqabət zamanı yayım və müşahidəçi məlumatından istifadə etmək qadağandır. Məxfi otaq məlumatlarını və şəxsi əlaqələri yayıma çıxarmayın.',
    'Turnir tanıtımında ad və təsvir istifadəsinin hüdudları ayrıca təsdiqlənmiş media şərtləri ilə müəyyən edilməlidir. AEVIC bu bələdçi ilə istifadəçinin bütün məzmununa mülkiyyət iddiası etmir. PUBG Mobile və üçüncü şəxslərin oyun, marka və yayım hüquqları onların sahiblərinə məxsusdur.',
  ] },
  { title: 'M — Məxfilik və hesab məlumatları', paragraphs: [
    'Qeydiyyat, hesab, komanda heyəti, yüklənmiş şəkillər və yarış fəaliyyəti xidmətin işləməsi üçün istifadə olunur. İctimai komanda profili, oyunçu adları və təsdiqlənmiş statistika ilə şəxsi əlaqə və autentifikasiya məlumatlarını fərqləndirin.',
    'Şifrəni, authenticator açarını, birdəfəlik kodları və bərpa kodlarını paylaşmayın. İki mərhələli doğrulamada authenticator kodu əsas üsuldur; bərpa kodu cihaz əlçatmaz olduqda istifadə edilir. Hesab təhlükəsizliyi şübhəsi varsa giriş məlumatlarını yeniləyin və dəstəyə müraciət edin.',
    'Məlumat toplama və emalının hazırkı izahı Məxfilik məlumatı səhifəsindədir. Saxlama müddəti, məlumat məsulu, hüquqların icrası və silinmə prosedurunun yekun hüquqi təsdiqi ayrıca tələb olunur. Bu mətn avtomatik silinmə, konkret saxlama müddəti və ya bütün məlumat üçün vahid şifrələmə zəmanəti vermir.',
  ] },
  { title: 'N — Versiyalar, tətbiq və əlaqə', paragraphs: [
    'Bu layihənin versiyası 1.0, hazırlanma tarixi 27 oktyabr 2026-dır. Qüvvəyə minmə tarixi sahibin təsdiqindən sonra ayrıca elan edilməlidir. Hüquqi baxışdan keçmiş yekun müqavilə kimi təqdim edilmir.',
    'Üstünlük ardıcıllığı: tətbiq olunan qanun; dərc edilmiş AEVIC platforma siyasətləri; onlara uyğun turnir reqlamenti; bunlara zidd olmayan rəsmi administrator göstərişləri. Turnirə məxsus istisna əvvəlcədən dərc edilməli, yuxarı səviyyəli qaydanı poza bilməz.',
    'Dəyişiklikdə versiya, tarix və təsirlənən bəndlər göstərilməlidir. Davam edən yarışın xal formulu və tarixi nəticələr xəbərsiz dəyişdirilməməlidir. Təcili dəyişiklik zərurəti əsaslandırılmalı və komandalara mövcud elan və bildiriş kanalları ilə çatdırılmalıdır.',
    'Administratorun şərhi qaydaların məqsədi, ardıcıllıq və sübutlarla məhdudlaşır; qeyri-məhdud ixtiyari səlahiyyət verilmir. Qərara etiraz üçün hesabdakı dəstək sorğusu və Əlaqə səhifəsində göstərilən mövcud kanallar istifadə olunur. Ayrıca əlaqə məlumatı dərc edilməyibsə bu bələdçi onu uydurmur.',
    'AEVIC müstəqil platformadır. Bu qaydaların beynəlxalq yarışlardan ilhamlanması EWC, Tencent, KRAFTON və ya PUBG Mobile ilə rəsmi tərəfdaşlıq və ya təsdiq iddiası deyil.',
  ] },
];
