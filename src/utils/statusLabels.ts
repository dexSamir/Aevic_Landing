/** User-facing labels; domain/API enums remain unchanged. */
const labels: Record<string,string> = {
 pending:'Gözləyir', approved:'Təsdiqlənib', rejected:'Rədd edilib', confirmed:'İştirak təsdiqlənib',
 withdrawn:'Geri götürülüb', waitlisted:'Ehtiyat siyahısında', ongoing:'Davam edir', completed:'Tamamlanıb',
 cancelled:'Ləğv edilib', draft:'Qaralama', published:'Dərc edilib', 'registration-open':'Qeydiyyat açıqdır',
 'under-review':'Yoxlanılır', 'waiting-for-user':'İstifadəçinin cavabı gözlənilir', open:'Açıq', 'in-progress':'İşlənir', resolved:'Həll edilib', closed:'Bağlanıb',
 unverified:'Təsdiqlənməyib', verified:'Təsdiqlənib', revoked:'Ləğv edilib', expired:'Müddəti bitib',
 consumed:'İstifadə edilib', claimed:'Sahiblik təsdiqlənib', unclaimed:'Sahiblik gözləyir', active:'Aktiv', inactive:'Deaktiv',
};
export function statusLabel(status:string) { return labels[status.toLowerCase()] ?? 'Naməlum vəziyyət'; }
