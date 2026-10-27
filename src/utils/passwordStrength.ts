/** Shared with password-change endpoints; existing provider requirements remain authoritative. */
export function passwordFeedback(value: string) {
  const normalized = value.toLocaleLowerCase('az').replace(/[^a-z0-9]/g, '');
  const common = /^(password|passw0rd|qwerty|qwertyuiop|letmein|welcome|admin|aevic|123456|abcdef)[0-9]*$/i.test(normalized) || /^(.)\1{5,}$/.test(normalized) || /^(\w{1,3})\1{2,}\d*$/.test(normalized);
  const requirements = [
    { met: value.length >= 8 && value.length <= 128, label: '8–128 simvol' },
    { met: /[A-ZƏÖÜĞÇŞİ]/.test(value), label: 'Ən azı bir böyük hərf' },
    { met: /[0-9]/.test(value), label: 'Ən azı bir rəqəm' },
    { met: !!value && !common, label: 'Yayılmış şifrə və təkrarlanan ardıcıllıq olmasın' },
  ];
  const valid = requirements.every(item => item.met);
  return { valid, requirements, score: !value ? 0 : !valid ? 1 : value.length >= 14 ? 3 : 2, label: !value ? 'Şifrə daxil edin' : !valid ? 'Zəif' : value.length >= 14 ? 'Güclü' : 'Uyğundur — daha uzun şifrə tövsiyə olunur' };
}
