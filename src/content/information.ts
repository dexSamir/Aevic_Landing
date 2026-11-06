export const informationDefaults: Record<string, [string,string][]> = {
  "privacy": [
    [
      "Topladığımız məlumatlar",
      "İstifadə etdiyiniz funksiyadan asılı olaraq ad və soyad, e-poçt, əlaqə telefonu, komanda adı və teqi, oyunçu adı və oyun UID-si, təqdim etdiyiniz profil şəkilləri və komanda mediası işlənir. Yarış iştirakları, heyət dəyişiklikləri, nəticələr, dəstək müraciətləri və cavabları da platformada saxlanılır."
    ],
    [
      "Google ilə giriş",
      "Google ilə davam etdikdə AEVIC Google hesabınızın sabit identifikatorunu, e-poçt ünvanını və onun təsdiq statusunu, mövcud olduqda ad və soyadınızı alır. Bunlar hesabı tanımaq, yaratmaq və girişinizi təsdiqləmək üçün istifadə olunur. Mövcud hesaba qoşulma əlavə təsdiq tələb edə bilər. Google şifrəniz AEVIC-ə verilmir. Bu giriş axını Gmail məktublarına, Google Drive fayllarına və kontaktlara giriş istəmir."
    ],
    [
      "Məlumatdan istifadə",
      "Hesab məlumatları giriş, hesab bərpası, profil idarəetməsi və təhlükəsizlik yoxlamaları üçün işlənir. Komanda və yarış məlumatları qeydiyyatı, heyəti, matçları və nəticələri idarə etməyə; əlaqə məlumatları isə hesab məktubları və dəstək cavablarını çatdırmağa xidmət edir. Google identifikatoru eyni hesabı növbəti girişlərdə tanımağa imkan verir."
    ],
    [
      "İctimai və məhdud məlumatlar",
      "İctimai komanda və oyunçu profillərində dərc etdiyiniz adlar, şəkillər, heyət və yarış nəticələri digər ziyarətçilərə görünə bilər. Hesabın əlaqə məlumatları, oyun UID-ləri və şəxsi əməliyyat məlumatları uyğun səlahiyyətlərlə işlənir. Şifrə və bərpa kodlarını ictimai profilə və ya dəstək mesajına əlavə etməyin."
    ],
    [
      "Xidmət təminatçıları",
      "Saytın və server funksiyalarının işləməsi üçün Netlify, məlumat bazası və uyğun saxlama xidmətləri üçün Supabase istifadə olunur. Google giriş zamanı şəxsiyyətinizi təsdiqləyir. Hesab məktublarının çatdırılması üçün konfiqurasiya edilmiş e-poçt xidməti ünvanınızı və məktub məzmununu emal edir. Media yükləmə funksiyasında seçilmiş saxlama xidməti təqdim etdiyiniz faylları emal edir. Bu xidmətlərə məlumat müvafiq funksiyanın işləməsi üçün ötürülür."
    ],
    [
      "Saxlanma və təhlükəsizlik",
      "Hesab və yarış məlumatları serverdə saxlanılır. Şifrələr açıq mətn kimi deyil, heşlənmiş formada yoxlanılır; şəxsi əməliyyatlara giriş hesab və səlahiyyət yoxlamalarından keçir. Sessiya və təhlükəsizlik qeydləri cihaz məlumatlarını, giriş vaxtlarını və əməliyyat nəticələrini əhatə edə bilər. Sorğu məhdudiyyətləri üçün IP ünvanından da istifadə olunur. Heç bir texniki tədbir tam təhlükəsizlik zəmanəti vermir."
    ],
    [
      "Brauzerdə saxlanma",
      "Giriş və “məni xatırla” seçimi üçün sessiya kukiləri və brauzerdəki giriş vəziyyəti istifadə olunur. İnterfeys seçimləri və ictimai statik fayllar lokal saxlanıla bilər. Şəxsi səhifələr və API cavabları tətbiqin oflayn keşinə yazılmır. Çıxış və aktiv sessiyaların idarə edilməsi hesabın təhlükəsizlik bölməsində mövcuddur."
    ],
    [
      "Məlumata çıxış, düzəliş və silinmə",
      "Hesab profilinizdə şəxsi məlumatları yeniləyə, təqdim olunan məlumat nüsxəsini yükləyə və hesabın silinməsi üçün sorğu göndərə bilərsiniz. Silinmə düyməsi müraciət yaradır; bütün məlumatı dərhal avtomatik silmir. Hesaba daxil ola bilmirsinizsə və ya ayrıca məlumatın silinməsini istəyirsinizsə, aevicesports@gmail.com ünvanına yazın. Müraciətdə hesab e-poçtunuzu və istəyinizi bildirin; şifrə, sessiya və bərpa kodlarını göndərməyin. Hesabın sizə aid olduğunu təsdiqləmək lazım ola bilər. Yarış nəticələri və əlaqəli qeydlərin silinməsi ayrıca qiymətləndirilir."
    ],
    [
      "Saxlama müddəti və əlaqə",
      "Bu səhifə bütün məlumat növləri üçün vahid saxlama və ya silinmə müddəti vəd etmir. Məlumatınızın saxlanması, istifadə olunan xidmətlər və silinmə müraciətinizin vəziyyəti barədə aevicesports@gmail.com vasitəsilə əlaqə saxlaya bilərsiniz. Platformadan istifadə barədə İstifadə şərtləri səhifəsinə də baxın."
    ]
  ],
  "terms": [
    [
      "Hazırkı əhatə",
      "Bu buraxılış ictimai yarış bələdçisini və təsdiqlənmiş komanda kataloqunu təqdim edir. Hesab və yarışa qeydiyyat əməliyyatları server qaydalarına və turnir vaxtlarına tabedir."
    ],
    [
      "Turnir qaydaları",
      "İştirak, heyət, ədalətli oyun və nəticələr üçün yarış qaydalarını və turnirin səhifəsindəki şərtləri nəzərdən keçirin."
    ],
    [
      "Hesab və məlumatlar",
      "Hesabınıza giriş məlumatlarını qoruyun. Şəxsi məlumatların işlənməsi və silinmə sorğuları Məxfilik siyasəti səhifəsində izah olunur. Hesab və istifadə sualları üçün aevicesports@gmail.com ünvanına yaza bilərsiniz."
    ],
    [
      "Status",
      "Bu səhifə ilkin məlumat üçündür və yekun hüquqi sənəd hesab edilmir."
    ]
  ],
  "contact": [
    [
      "Yarış əməliyyatları",
      "Hesabınızdakı dəstək bölməsindən sorğu göndərə və cavabları izləyə bilərsiniz."
    ],
    [
      "Komanda dəstəyi",
      "Komanda təsdiqi və heyət sorğuları komanda iş sahəsindən izlənilir."
    ],
    [
      "Rəsmi əlaqə",
      "Təsdiqlənmiş sosial kanallar konfiqurasiya edildikdə səhifənin aşağı hissəsində görünür. Heç bir keçid göstərilmirsə, əlaqə kanalı bu buraxılışda hələ dərc edilməyib."
    ]
  ]
};
