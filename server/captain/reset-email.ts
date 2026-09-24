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
 const icon=(content:string,color:string,bg:string)=>`<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" width="34" height="34" style="width:34px;height:34px;border-radius:9px;background-color:${bg};color:${color};font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:34px" aria-hidden="true">${content}</td></tr></table>`;
 const panel=(symbol:string,color:string,bg:string,content:string)=>`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="table-layout:fixed;margin-top:14px;background-color:${bg};border-radius:12px"><tr><td class="email-panel" style="padding:13px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="table-layout:fixed"><tr><td class="email-icon" width="46" valign="top" style="width:46px">${icon(symbol,color,bg==='#241C30'?'#351D49':'#303035')}</td><td valign="top" style="color:#BFC0C8;font-size:14px;line-height:21px;overflow-wrap:anywhere;word-wrap:break-word">${content}</td></tr></table></td></tr></table>`;
 const html=`<!doctype html><html lang="az"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${subject}</title>
<style>
a{color:#F3C450}
table{border-spacing:0;mso-table-lspace:0pt;mso-table-rspace:0pt}
@media only screen and (max-width:480px){
.email-outer{padding:22px 12px!important}
.email-brand{padding:0 20px 18px!important}
.email-logo{width:90px!important}
.email-content{padding:22px 20px!important;border-radius:16px!important}
.email-title{font-size:28px!important;line-height:1.15!important;letter-spacing:-.6px!important}
.email-button{width:100%!important;max-width:100%!important}
.email-panel{padding:12px!important}
.email-icon{width:44px!important}
}
@media only screen and (max-width:359px){
.email-outer{padding:20px 10px!important}
.email-brand{padding-left:18px!important;padding-right:18px!important}
.email-content{padding:20px 18px!important}
.email-title{font-size:26px!important}
.email-label{font-size:10px!important;letter-spacing:1px!important}
.email-panel{padding:12px!important}
}
</style></head>
<body style="margin:0;padding:0;background-color:#101014;color:#F7F6F2;font-family:Inter,Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">AEVIC hesabınız üçün təhlükəsiz şifrə yeniləmə keçidi. 30 dəqiqə ərzində istifadə edin.${'&#8204;&nbsp;'.repeat(90)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#101014"><tr><td class="email-outer" align="center" style="padding:28px 16px;background-color:#101014;background-image:url('https://aevic-demo.netlify.app/brand/aevic-email-background.png');background-position:center top;background-repeat:no-repeat;background-size:640px auto" background="https://aevic-demo.netlify.app/brand/aevic-email-background.png" bgcolor="#101014">
<!--[if mso]><table role="presentation" width="480" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:480px;table-layout:fixed">
<tr><td class="email-brand" align="left" style="padding:0 26px 18px">
<img class="email-logo" src="https://aevic-demo.netlify.app/brand/aevic-email-logo.png" width="90" height="90" alt="AEVIC Esports" style="display:block;width:90px;max-width:100%;height:auto;border:0">
<p class="email-label" style="margin:12px 0 0;color:#BFC0C8;font-size:10px;line-height:18px;font-weight:600;letter-spacing:2px"><span style="color:#F3C450;font-size:14px;letter-spacing:-1px">//</span>&nbsp;&nbsp; HESAB TƏHLÜKƏSİZLİYİ</p>
</td></tr>
<tr><td class="email-content" bgcolor="#1B1B1F" style="padding:26px;border-radius:18px">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" width="40" height="40" style="width:40px;height:40px;background-color:#303035;border-radius:12px" aria-hidden="true"><span style="display:inline-block;width:11px;height:10px;border:2px solid #F3C450;border-bottom:0;border-radius:10px 10px 0 0;vertical-align:bottom"></span><br><span style="display:inline-block;width:15px;height:12px;border:2px solid #F3C450;border-radius:3px;vertical-align:top"></span></td></tr></table>
<h1 class="email-title" style="margin:16px 0;color:#F7F6F2;font-size:30px;line-height:35px;letter-spacing:-.6px;font-weight:700">Yeni şifrə.<br><span style="color:#F3C450">Təhlükəsiz giriş.</span></h1>
<p style="margin:0 0 20px;color:#BFC0C8;font-size:14px;line-height:22px">Hesabınız üçün şifrə sıfırlama sorğusu aldıq.<br>Aşağıdakı düyməni seçib yeni şifrənizi özünüz təyin edin.</p>
<table class="email-button" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:240px"><tr><td align="center" bgcolor="#F3C450" style="border-radius:9px;mso-padding-alt:12px 18px">
<a class="email-cta" href="${href}" rel="noreferrer" style="display:block;padding:12px 10px;background-color:#F3C450;border-radius:9px;color:#101014;font-size:15px;line-height:24px;font-weight:700;text-align:center;text-decoration:none;mso-padding-alt:0"><span style="mso-text-raise:6pt">Şifrəni yenilə&nbsp;&nbsp;&nbsp; <span aria-hidden="true">→</span></span></a>
</td></tr></table>
${panel('◷','#BF64E8','#241C30','<strong style="color:#F7F6F2;font-size:14px">30 dəqiqə etibarlıdır.</strong><br>Keçid yalnız bir dəfə istifadə edilə bilər.')}
${panel('↗','#BFC0C8','#252529',`<p style="margin:0 0 8px">Düymə açılmırsa, bu keçidi brauzerə köçürün:</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="table-layout:fixed"><tr><td style="padding:8px 10px;background-color:#1B1B1F;border-radius:10px;word-break:break-all;overflow-wrap:anywhere"><a href="${href}" rel="noreferrer" style="color:#F3C450;font-family:Consolas,'Courier New',monospace;font-size:13px;line-height:20px;text-decoration:underline;word-break:break-all;overflow-wrap:anywhere;word-wrap:break-word">${href}</a></td></tr></table>`)}
${panel('<span style="display:inline-block;width:21px;height:21px;border:2px solid #F3C450;border-radius:50%;font-size:18px;line-height:21px;font-weight:700">!</span>','#F3C450','#252529','<strong style="color:#F7F6F2;font-size:14px">Bu sorğunu siz göndərməmisinizsə</strong><p style="margin:4px 0 0">bu e-maili nəzərə almayın. Keçidi istifadə etmədikcə şifrəniz dəyişməyəcək. Təhlükəsizliyiniz üçün keçidi heç kimlə paylaşmayın.</p>')}
</td></tr>
<tr><td align="center" style="padding:18px 14px 0;color:#BFC0C8"><p style="margin:0;font-size:11px;line-height:19px;font-weight:700;letter-spacing:3px">AEVIC ESPORTS</p><p style="margin:3px 0 0;font-size:11px;line-height:19px;letter-spacing:2px">Ad Aeternam Victoriam.</p><p class="email-socials" style="margin:10px 0 0;font-size:12px;line-height:24px;text-align:center"><a href="https://www.instagram.com/aevicesports" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin:0 7px;color:#BFC0C8;font-size:12px;line-height:28px;text-decoration:none;white-space:nowrap">Instagram</a>
<a href="https://www.tiktok.com/@aevicesports" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin:0 7px;color:#BFC0C8;font-size:12px;line-height:28px;text-decoration:none;white-space:nowrap">TikTok</a>
<a href="https://www.linkedin.com/company/109203444/" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin:0 7px;color:#BFC0C8;font-size:12px;line-height:28px;text-decoration:none;white-space:nowrap">LinkedIn</a>
<a href="https://x.com/aevicesports" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin:0 7px;color:#BFC0C8;font-size:12px;line-height:28px;text-decoration:none;white-space:nowrap">X</a></p></td></tr>
</table><!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
 return {subject,text,html};
}
