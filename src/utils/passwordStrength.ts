/** Shared with password-change endpoints; existing provider requirements remain authoritative. */
export function passwordFeedback(value: string, identifiers: string[] = []) {
  const normalized = value.toLocaleLowerCase('az').replace(/[^a-z0-9]/g, '');
  const common = /^(password|passw0rd|qwerty|qwertyuiop|letmein|welcome|admin|aevic|123456|abcdef)[0-9]*$/i.test(normalized) || /^(.)\1{5,}$/.test(normalized) || /^(\w{1,3})\1{2,}\d*$/.test(normalized);
  const requirements = [
    { met: value.length >= 8 && value.length <= 128, label: '8–128 simvol' },
    { met: /[A-ZƏÖÜĞÇŞİ]/.test(value), label: 'Ən azı bir böyük hərf' },
    { met: /[0-9]/.test(value), label: 'Ən azı bir rəqəm' },
    { met: !!value && !common, label: 'Yayılmış şifrə və təkrarlanan ardıcıllıq olmasın' },
  ];
  const valid = requirements.every(item => item.met);
  const categories = [/[A-ZƏÖÜĞÇŞİ]/, /[a-zəöüğçşı]/, /[0-9]/, /[^\p{L}\p{N}\s]/u].filter(pattern => pattern.test(value)).length;
  const folded = value.toLowerCase().replace(/[013457@$]/g, char => ({ '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's' })[char]!);
  const predictable = common || /password|qwerty|letmein|welcome|1234|abcd|asdf|zxcv/.test(folded) || /1234|4321|9876|202[0-9]/.test(value) || /(.)\1{3,}/.test(value) || /(.{2,4})\1{2,}/.test(value);
  const personal = identifiers.some(identifier => identifier.length >= 4 && folded.includes(identifier.toLowerCase().split('@')[0]));
  const unique = new Set(value.toLowerCase()).size;
  let score = value.length < 8 ? 1 : value.length >= 20 && unique >= 10 ? 5 : value.length >= 14 && categories >= 3 ? 5 : value.length >= 12 && categories >= 3 ? 4 : value.length >= 10 && categories >= 2 ? 3 : 2;
  if (predictable || personal || unique < 5) score = Math.min(score, 2);
  if (!value) score = 0;
  return { valid, requirements, score, label: ['Şifrə daxil edin', 'Çox zəif', 'Zəif', 'Orta', 'Güclü', 'Çox güclü'][score] };
}
