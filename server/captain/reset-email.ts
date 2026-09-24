const escapeHtml = (value:string) => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));

/** No trackers, external fonts, or token-bearing assets. Only the two reset links contain the token. */
export function passwordResetEmail(link:string) {
 const url=new URL(link);
 if(url.protocol!=='https:' && !(url.protocol==='http:' && ['localhost','127.0.0.1'].includes(url.hostname)))throw new Error('INVALID_RESET_ORIGIN');
 const href=escapeHtml(url.href);
 const subject='AEVIC — şifrənizi yeniləyin';
 const text=`AEVIC ESPORTS\n// HESAB TƏHLÜKƏSİZLİYİ\n\nŞifrənizi təhlükəsiz yeniləyin.\n\nHesabınız üçün şifrə sıfırlama sorğusu aldıq. Aşağıdakı keçidi açıb yeni şifrənizi özünüz təyin edin. Keçid 30 dəqiqə etibarlıdır və yalnız bir dəfə istifadə edilə bilər.\n\nŞifrəni yenilə:\n${url.href}\n\nBu sorğunu siz göndərməmisinizsə, emaili nəzərə almayın. Keçidi istifadə etmədikcə şifrəniz dəyişməyəcək. Bu keçidi heç kimlə paylaşmayın.\n\nAEVIC Esports\nAd Aeternam Victoriam.`;
 const html=`<!doctype html><html lang="az"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><title>${subject}</title>
<style>@media only screen and (max-width:600px){.email-outer{padding:20px 12px!important}.email-content{padding:28px 22px!important}.email-title{font-size:30px!important;line-height:36px!important}.email-cta{display:block!important;text-align:center!important}}a{color:#f3c450}</style></head>
<body style="margin:0;padding:0;background-color:#0a0a0c;color:#f5f3ed;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">AEVIC hesabınız üçün təhlükəsiz şifrə yeniləmə keçidi. 30 dəqiqə ərzində istifadə edin.${'&#8204;&nbsp;'.repeat(90)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0a0a0c"><tr><td class="email-outer" align="center" style="padding:40px 20px">
<!--[if mso]><table role="presentation" width="560"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;border:1px solid #303034;background-color:#121215">
<tr><td style="height:3px;background-color:#f3c450;font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td class="email-content" style="padding:34px 40px 28px;border-bottom:1px solid #303034"><img src="https://aevic-demo.netlify.app/brand/aevic-phoenix.jpg" width="64" height="64" alt="AEVIC" style="display:block;width:64px;height:64px;margin:0 0 18px;border:0;border-radius:4px"><p style="margin:0;color:#f3c450;font-size:25px;line-height:30px;font-weight:800;letter-spacing:5px">AEVIC</p><p style="margin:6px 0 0;color:#b7b5be;font-size:10px;line-height:16px;letter-spacing:4px">ESPORTS</p></td></tr>
<tr><td class="email-content" style="padding:36px 40px"><p style="margin:0 0 20px;color:#f3c450;font-size:11px;line-height:18px;font-weight:700;letter-spacing:2px">// HESAB TƏHLÜKƏSİZLİYİ</p>
<h1 class="email-title" style="margin:0 0 20px;color:#f5f3ed;font-size:36px;line-height:43px;letter-spacing:-1px;font-weight:700">Yeni şifrə.<br>Təhlükəsiz giriş.</h1>
<p style="margin:0 0 28px;color:#c9c7cf;font-size:16px;line-height:26px">Hesabınız üçün şifrə sıfırlama sorğusu aldıq. Aşağıdakı düyməni seçib yeni şifrənizi özünüz təyin edin.</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td align="left"><a class="email-cta" href="${href}" rel="noreferrer" style="display:inline-block;background-color:#f3c450;border:1px solid #f3c450;border-radius:4px;color:#0a0a0c;font-size:16px;line-height:24px;font-weight:700;text-decoration:none;padding:16px 28px;mso-padding-alt:0"><!--[if mso]><i style="letter-spacing:28px;mso-font-width:-100%;mso-text-raise:24pt">&nbsp;</i><![endif]--><span style="mso-text-raise:12pt">Şifrəni yenilə</span><!--[if mso]><i style="letter-spacing:28px;mso-font-width:-100%">&nbsp;</i><![endif]--></a></td></tr></table>
<p style="margin:24px 0 0;padding-left:14px;border-left:3px solid #6a1b9a;color:#c9c7cf;font-size:13px;line-height:22px"><strong style="color:#f5f3ed">30 dəqiqə etibarlıdır.</strong><br>Keçid yalnız bir dəfə istifadə edilə bilər.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:30px;table-layout:fixed"><tr><td style="padding-top:24px;border-top:1px solid #303034"><p style="margin:0 0 10px;color:#b7b5be;font-size:12px;line-height:20px">Düymə açılmırsa, bu keçidi brauzerə köçürün:</p><a href="${href}" rel="noreferrer" style="color:#f3c450;font-size:12px;line-height:20px;text-decoration:underline;word-break:break-all;overflow-wrap:anywhere">${href}</a></td></tr></table>
<p style="margin:28px 0 0;color:#b7b5be;font-size:13px;line-height:22px">Bu sorğunu siz göndərməmisinizsə, emaili nəzərə almayın. Keçidi istifadə etmədikcə şifrəniz dəyişməyəcək. Təhlükəsizliyiniz üçün keçidi heç kimlə paylaşmayın.</p></td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
<p style="margin:24px 0 0;color:#aaa7b2;font-size:11px;line-height:20px;letter-spacing:1px">AEVIC ESPORTS<br><span style="color:#aaa7b2;letter-spacing:0">Ad Aeternam Victoriam.</span></p></td></tr></table></body></html>`;
 return {subject,text,html};
}
