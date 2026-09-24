const escapeHtml = (value:string) => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));

/** No trackers, external fonts, or token-bearing assets. Only the two reset links contain the token. */
export function passwordResetEmail(link:string) {
 const url=new URL(link);
 if(url.protocol!=='https:' && !(url.protocol==='http:' && ['localhost','127.0.0.1'].includes(url.hostname)))throw new Error('INVALID_RESET_ORIGIN');
 if((process.env.NODE_ENV==='production'||process.env.CONTEXT) && ['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new Error('INVALID_RESET_ORIGIN');
 const href=escapeHtml(url.href);
 const subject='AEVIC — şifrənizi yeniləyin';
 const text=`AEVIC ESPORTS\n// HESAB TƏHLÜKƏSİZLİYİ\n\nŞifrənizi təhlükəsiz yeniləyin.\n\nHesabınız üçün şifrə sıfırlama sorğusu aldıq. Aşağıdakı keçidi açıb yeni şifrənizi özünüz təyin edin. Keçid 30 dəqiqə etibarlıdır və yalnız bir dəfə istifadə edilə bilər.\n\nŞifrəni yenilə:\n${url.href}\n\nBu sorğunu siz göndərməmisinizsə, emaili nəzərə almayın. Keçidi istifadə etmədikcə şifrəniz dəyişməyəcək. Bu keçidi heç kimlə paylaşmayın.\n\nAEVIC Esports\nAd Aeternam Victoriam.`;
 // Decorative icons use email-safe text/HTML, with no additional remote assets.
 const icon=(content:string,color:string,bg:string)=>`<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" width="44" height="44" style="width:44px;height:44px;border-radius:12px;background-color:${bg};color:${color};font-family:Arial,Helvetica,sans-serif;font-size:30px;line-height:44px" aria-hidden="true">${content}</td></tr></table>`;
 const panel=(symbol:string,color:string,bg:string,content:string)=>`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="table-layout:fixed;margin-top:18px;background-color:${bg};border-radius:18px"><tr><td class="email-panel" style="padding:18px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="table-layout:fixed"><tr><td class="email-icon" width="60" valign="top" style="width:60px">${icon(symbol,color,bg==='#241C30'?'#351D49':'#303035')}</td><td valign="top" style="color:#BFC0C8;font-size:15px;line-height:24px;overflow-wrap:anywhere;word-wrap:break-word">${content}</td></tr></table></td></tr></table>`;
 const html=`<!doctype html><html lang="az"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${subject}</title>
<style>
a{color:#F3C450}
table{border-spacing:0;mso-table-lspace:0pt;mso-table-rspace:0pt}
@media only screen and (max-width:600px){
.email-outer{padding:24px 12px!important}
.email-brand{padding:0 22px 24px!important}
.email-logo{width:136px!important}
.email-content{padding:26px 22px!important;border-radius:18px!important}
.email-title{font-size:30px!important;line-height:1.15!important;letter-spacing:-.6px!important}
.email-button{width:100%!important;max-width:100%!important}
.email-panel{padding:14px!important}
.email-icon{width:54px!important}
}
@media only screen and (max-width:359px){
.email-outer{padding:20px 10px!important}
.email-brand{padding-left:18px!important;padding-right:18px!important}
.email-content{padding:24px 18px!important}
.email-title{font-size:27px!important}
.email-label{font-size:10px!important;letter-spacing:1px!important}
.email-panel{padding:12px!important}
}
</style></head>
<body style="margin:0;padding:0;background-color:#101014;color:#F7F6F2;font-family:Inter,Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">AEVIC hesabınız üçün təhlükəsiz şifrə yeniləmə keçidi. 30 dəqiqə ərzində istifadə edin.${'&#8204;&nbsp;'.repeat(90)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#101014"><tr><td class="email-outer" align="center" style="padding:36px 20px">
<!--[if mso]><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;table-layout:fixed">
<tr><td class="email-brand" align="left" style="padding:0 36px 24px">
<img class="email-logo" src="https://aevic-demo.netlify.app/brand/aevic-phoenix.jpg" width="160" height="160" alt="AEVIC Esports" style="display:block;width:160px;max-width:100%;height:auto;border:0">
<p class="email-label" style="margin:18px 0 0;color:#BFC0C8;font-size:11px;line-height:20px;font-weight:600;letter-spacing:2px"><span style="color:#F3C450;font-size:20px;letter-spacing:-1px">//</span>&nbsp;&nbsp; HESAB TƏHLÜKƏSİZLİYİ</p>
</td></tr>
<tr><td class="email-content" bgcolor="#1B1B1F" style="padding:32px 36px 28px;border-radius:24px">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" width="52" height="52" style="width:52px;height:52px;background-color:#303035;border-radius:12px" aria-hidden="true"><span style="display:inline-block;width:14px;height:13px;border:3px solid #F3C450;border-bottom:0;border-radius:10px 10px 0 0;vertical-align:bottom"></span><br><span style="display:inline-block;width:20px;height:15px;border:3px solid #F3C450;border-radius:3px;vertical-align:top"></span></td></tr></table>
<h1 class="email-title" style="margin:20px 0 20px;color:#F7F6F2;font-size:40px;line-height:46px;letter-spacing:-1px;font-weight:700">Yeni şifrə.<br><span style="color:#F3C450">Təhlükəsiz giriş.</span></h1>
<p style="margin:0 0 26px;color:#BFC0C8;font-size:16px;line-height:25px">Hesabınız üçün şifrə sıfırlama sorğusu aldıq.<br>Aşağıdakı düyməni seçib yeni şifrənizi özünüz təyin edin.</p>
<table class="email-button" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:300px"><tr><td align="center" bgcolor="#F3C450" style="border-radius:12px;mso-padding-alt:18px 24px">
<a class="email-cta" href="${href}" rel="noreferrer" style="display:block;padding:18px 12px;background-color:#F3C450;border-radius:12px;color:#101014;font-size:18px;line-height:24px;font-weight:700;text-align:center;text-decoration:none;mso-padding-alt:0"><span style="mso-text-raise:9pt">Şifrəni yenilə&nbsp;&nbsp;&nbsp; <span aria-hidden="true">→</span></span></a>
</td></tr></table>
${panel('◷','#BF64E8','#241C30','<strong style="color:#F7F6F2;font-size:16px">30 dəqiqə etibarlıdır.</strong><br>Keçid yalnız bir dəfə istifadə edilə bilər.')}
${panel('↗','#BFC0C8','#252529',`<p style="margin:0 0 8px">Düymə açılmırsa, bu keçidi brauzerə köçürün:</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="table-layout:fixed"><tr><td style="padding:10px 12px;background-color:#1B1B1F;border-radius:10px;word-break:break-all;overflow-wrap:anywhere"><a href="${href}" rel="noreferrer" style="color:#F3C450;font-family:Consolas,'Courier New',monospace;font-size:14px;line-height:22px;text-decoration:underline;word-break:break-all;overflow-wrap:anywhere;word-wrap:break-word">${href}</a></td></tr></table>`)}
${panel('<span style="display:inline-block;width:25px;height:25px;border:2px solid #F3C450;border-radius:50%;font-size:22px;line-height:25px;font-weight:700">!</span>','#F3C450','#252529','<strong style="color:#F7F6F2;font-size:16px">Bu sorğunu siz göndərməmisinizsə</strong><p style="margin:4px 0 0">bu e-maili nəzərə almayın. Keçidi istifadə etmədikcə şifrəniz dəyişməyəcək. Təhlükəsizliyiniz üçün keçidi heç kimlə paylaşmayın.</p>')}
</td></tr>
<tr><td align="center" style="padding:22px 18px 0;color:#BFC0C8"><p style="margin:0;font-size:12px;line-height:22px;font-weight:700;letter-spacing:3px">AEVIC ESPORTS</p><p style="margin:3px 0 0;font-size:12px;line-height:22px;letter-spacing:2px">Ad Aeternam Victoriam.</p></td></tr>
</table><!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
 return {subject,text,html};
}
