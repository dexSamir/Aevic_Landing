const labels: Record<string, string> = {
  pending: 'Gözləyir', 'under-review': 'Yoxlanılır', approved: 'Təsdiqlənib', rejected: 'Rədd edilib',
  resolved: 'Həll edilib', registered: 'Qeydiyyatdan keçib', verified: 'Təsdiqlənib', legacy: 'Yarış irsi',
  owned: 'Təşkilata bağlı', independent: 'Müstəqil', captain: 'Kapitan', starter: 'Əsas heyət', substitute: 'Əvəzedici',
  active: 'Aktiv', inactive: 'Passiv', draft: 'Qaralama', published: 'Dərc edilib', completed: 'Tamamlanıb',
  cancelled: 'Ləğv edilib', banned: 'Bloklanıb', open: 'Açıq', closed: 'Bağlı', confirmed: 'Təsdiqlənib',
};

/** Display only: never changes API identifiers or persisted values. */
export function productTerm(value: string) { return labels[value] ?? value; }
