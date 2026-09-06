# AEVIC product lexicon

Interface language is Azerbaijani. API fields, enum values, route paths, logs and developer documentation keep their original identifiers. Never translate a stored status value to implement this policy; translate its display label.

| Source term | User-facing wording |
|---|---|
| Review facts | Yoxlama məlumatları |
| Public profile status | İctimai profil statusu |
| Registered | Qeydiyyatdan keçib |
| Approved / verified | Təsdiqlənmiş komanda (with the specific verification scope explained) |
| Legacy | Yarış irsi |
| Organization-owned | Təşkilata bağlı |
| Independent | Müstəqil |
| Competition operations | Yarış əməliyyatları |
| Pending | Gözləyir |
| Under review | Yoxlanılır |
| Rejected | Rədd edilib |
| Resolved | Həll edilib |
| Draft | Qaralama |
| Captain | Kapitan |
| Roster | Heyət |
| Starter / substitute | Əsas heyət / Əvəzedici |
| Review / approve / reject | Yoxla / Təsdiqlə / Rədd et |
| Support / ticket | Dəstək / Dəstək sorğusu |
| Match / round / room | Matç / Raund / Otaq |
| Result publishing | Nəticələrin dərci |
| Deadline | Son tarix |
| Evidence | Sübut |
| Audit log | Audit jurnalı |
| Email | E-poçt |
| Preview | Önbaxış |

Retain AEVIC, PUBG Mobile, Wrapped, Check-in, PNG, PDF, QR, 2FA and map/team proper names. Retain WWCD and PP/KP as competition notation with explanations nearby. An absent capability says “hələ əlçatan deyil”; an empty successful result says no records are published; a failed request says loading failed and offers retry only where safe. “Rəsmi” requires a published authoritative source. Draft saves are local and must not claim server submission. Development previews must remain labeled and inaccessible in production.

Backend access roles (Super Admin, Tournament Manager, Result Operator, Support Moderator) may be retained in the read-only permissions matrix because they identify the contract; ordinary actions and instructions remain Azerbaijani.
