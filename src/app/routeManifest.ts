import type { Capability, ServiceCapabilities } from '../services/capabilities';

export interface RouteDefinition {
  id: string; path: string; family: 'PUBLIC' | 'AUTH' | 'TEAM' | 'ACCOUNT' | 'ADMIN' | 'SYSTEM';
  title: string; description: string; section: string; navigation: string;
  // Capability describes backend availability, not public route visibility.
  capability?: Capability; indexable: boolean;
  unavailableBehavior?: 'render';
}

export const routeManifest = [
  {
    "id": "home",
    "path": "/",
    "family": "PUBLIC",
    "title": "AEVIC Esports — Competitive Legacy",
    "description": "Azərbaycan PUBG Mobile icması üçün yarış bələdçisi və təsdiqlənmiş komandalar.",
    "section": "public",
    "navigation": "/",
    "indexable": true
  },
  {
    "id": "tournaments",
    "path": "/tournaments",
    "family": "PUBLIC",
    "title": "Turnir təqvimi",
    "description": "Dərc edilmiş AEVIC turnirləri, tarixlər və iştirak şərtləri.",
    "section": "public",
    "navigation": "/tournaments",
    "indexable": true
  },
  {
    "id": "tournaments_tournamentId_recap",
    "path": "/tournaments/:tournamentId/recap",
    "family": "PUBLIC",
    "title": "Turnir icmalı",
    "description": "Turnir icmalı — AEVIC ictimai və yarış iş axını.",
    "section": "public",
    "navigation": "/tournaments",
    "capability": "publicArchive",
    "indexable": false
  },
  {
    "id": "tournaments_tournamentId",
    "path": "/tournaments/:tournamentId",
    "family": "PUBLIC",
    "title": "Turnir detalları",
    "description": "Turnir detalları — AEVIC ictimai və yarış iş axını.",
    "section": "public",
    "navigation": "/tournaments",
    "indexable": false
  },
  {
    "id": "leaderboard",
    "path": "/leaderboard",
    "family": "PUBLIC",
    "title": "Liderlik cədvəli",
    "description": "Yalnız dərc edilmiş turnir sıralamaları və rəsmi xallar.",
    "section": "public",
    "navigation": "/tournaments",
    "indexable": true
  },
  {
    "id": "regulations",
    "path": "/regulations",
    "family": "PUBLIC",
    "title": "Yarış reqlamenti",
    "description": "Komanda heyəti, yarış qaydaları, xal formulu və iştirak şərtləri.",
    "section": "public",
    "navigation": "/tournaments",
    "indexable": true
  },
  {
    "id": "contact",
    "path": "/contact",
    "family": "PUBLIC",
    "title": "Əlaqə məlumatları",
    "description": "AEVIC ilə mövcud rəsmi əlaqə kanalları.",
    "section": "public",
    "navigation": "",
    "indexable": true
  },
  {
    "id": "privacy",
    "path": "/privacy",
    "family": "PUBLIC",
    "title": "Məxfilik siyasəti",
    "description": "AEVIC-də məlumatların işlənməsi və məxfilik prinsipləri.",
    "section": "public",
    "navigation": "",
    "indexable": true
  },
  {
    "id": "terms",
    "path": "/terms",
    "family": "PUBLIC",
    "title": "İstifadə şərtləri",
    "description": "AEVIC ictimai xidmətindən istifadə şərtləri.",
    "section": "public",
    "navigation": "",
    "indexable": true
  },
  {
    "id": "support",
    "path": "/support",
    "family": "PUBLIC",
    "title": "Dəstək mərkəzi",
    "description": "Yarış qaydaları və ictimai buraxılış imkanları haqqında kömək.",
    "section": "public",
    "navigation": "",
    "indexable": true
  },
  {
    "id": "organizations",
    "path": "/organizations",
    "family": "PUBLIC",
    "title": "Təşkilatlar",
    "description": "Təşkilatlar — AEVIC ictimai və yarış iş axını.",
    "section": "public",
    "navigation": "/teams",
    "capability": "publicOrganizations",
    "indexable": false
  },
  {
    "id": "organizations_organizationSlug",
    "path": "/organizations/:organizationSlug",
    "family": "PUBLIC",
    "title": "Təşkilat profili",
    "description": "Təşkilat profili — AEVIC ictimai və yarış iş axını.",
    "section": "public",
    "navigation": "/teams",
    "capability": "publicOrganizations",
    "indexable": false
  },
  {
    "id": "records",
    "path": "/records",
    "family": "PUBLIC",
    "title": "Rekordlar mərkəzi",
    "description": "Rekordlar mərkəzi — AEVIC ictimai və yarış iş axını.",
    "section": "public",
    "navigation": "/tournaments",
    "capability": "publicRecords",
    "indexable": false
  },
  {
    "id": "records_recordId",
    "path": "/records/:recordId",
    "family": "PUBLIC",
    "title": "Rekord mənbəyi",
    "description": "Rekord mənbəyi — AEVIC ictimai və yarış iş axını.",
    "section": "public",
    "navigation": "/tournaments",
    "capability": "publicRecords",
    "indexable": false
  },
  {
    "id": "teams",
    "path": "/teams",
    "family": "PUBLIC",
    "title": "AEVIC komandaları",
    "description": "AEVIC-də ictimai görünürlüyü təsdiqlənmiş komanda kimlikləri.",
    "section": "public",
    "navigation": "/teams",
    "indexable": true
  },
  {
    "id": "teams_compare",
    "path": "/teams/compare",
    "family": "PUBLIC",
    "title": "Komanda müqayisəsi",
    "description": "Komanda müqayisəsi — AEVIC ictimai və yarış iş axını.",
    "section": "public",
    "navigation": "/teams",
    "capability": "publicTeamHistory",
    "indexable": false
  },
  {
    "id": "teams_teamSlug_share_card",
    "path": "/teams/:teamSlug/share-card",
    "family": "PUBLIC",
    "title": "Komanda kimlik kartı",
    "description": "Komanda kimlik kartı — AEVIC ictimai və yarış iş axını.",
    "section": "public",
    "navigation": "/teams",
    "capability": "publicTeamHistory",
    "indexable": false
  },
  {
    "id": "teams_teamSlug",
    "path": "/teams/:teamSlug",
    "family": "PUBLIC",
    "title": "Komanda profili",
    "description": "Təsdiqlənmiş komanda kimliyi və mənbədə mövcud olan ictimai məlumatlar.",
    "section": "public",
    "navigation": "/teams",
    "indexable": false
  },
  {
    "id": "matches",
    "path": "/matches",
    "family": "PUBLIC",
    "title": "Matç mərkəzi",
    "description": "Matç mərkəzi — AEVIC ictimai və yarış iş axını.",
    "section": "public",
    "navigation": "/matches",
    "capability": "publicMatches",
    "unavailableBehavior": "render",
    "indexable": false
  },
  {
    "id": "matches_matchId",
    "path": "/matches/:matchId",
    "family": "PUBLIC",
    "title": "Matç keçidi",
    "description": "Matç keçidi — AEVIC ictimai və yarış iş axını.",
    "section": "public",
    "navigation": "/matches",
    "capability": "publicMatches",
    "indexable": false
  },
  {
    "id": "search",
    "path": "/search",
    "family": "PUBLIC",
    "title": "Axtarış",
    "description": "Axtarış — AEVIC ictimai və yarış iş axını.",
    "section": "public",
    "navigation": "",
    "capability": "publicSearch",
    "indexable": false
  },
  {
    "id": "following",
    "path": "/following",
    "family": "PUBLIC",
    "title": "İzlədiklərim",
    "description": "İzlədiklərim — AEVIC ictimai və yarış iş axını.",
    "section": "public",
    "navigation": "/teams",
    "capability": "publicSession",
    "indexable": false
  },
  {
    "id": "archive",
    "path": "/archive",
    "family": "PUBLIC",
    "title": "Mövsüm arxivi",
    "description": "Mövsüm arxivi — AEVIC ictimai və yarış iş axını.",
    "section": "public",
    "navigation": "/tournaments",
    "capability": "publicArchive",
    "indexable": false
  },
  {
    "id": "403",
    "path": "/403",
    "family": "SYSTEM",
    "title": "İcazə yoxdur",
    "description": "İcazə yoxdur — AEVIC ictimai və yarış iş axını.",
    "section": "system",
    "navigation": "",
    "indexable": false
  },
  {
    "id": "500",
    "path": "/500",
    "family": "SYSTEM",
    "title": "Server xətası",
    "description": "Server xətası — AEVIC ictimai və yarış iş axını.",
    "section": "system",
    "navigation": "",
    "indexable": false
  },
  {
    "id": "maintenance",
    "path": "/maintenance",
    "family": "SYSTEM",
    "title": "Texniki xidmət",
    "description": "Texniki xidmət — AEVIC ictimai və yarış iş axını.",
    "section": "system",
    "navigation": "",
    "indexable": false
  },
  {
    "id": "offline",
    "path": "/offline",
    "family": "SYSTEM",
    "title": "Bağlantı yoxdur",
    "description": "Bağlantı yoxdur — AEVIC ictimai və yarış iş axını.",
    "section": "system",
    "navigation": "",
    "indexable": false
  },
  {
    "id": "not_found",
    "path": "*",
    "family": "SYSTEM",
    "title": "Səhifə tapılmadı",
    "description": "Səhifə tapılmadı — AEVIC ictimai və yarış iş axını.",
    "section": "system",
    "navigation": "",
    "indexable": false
  },
  {
    "id": "teams_teamSlug_wrapped_year",
    "path": "/teams/:teamSlug/wrapped/:year",
    "family": "PUBLIC",
    "title": "Komandanın illik icmalı",
    "description": "Komandanın illik icmalı — AEVIC ictimai və yarış iş axını.",
    "section": "public",
    "navigation": "/teams",
    "capability": "publicTeamHistory",
    "indexable": false
  },
  {
    "id": "login",
    "path": "/login",
    "family": "AUTH",
    "title": "Hesaba giriş",
    "description": "Hesaba giriş — AEVIC ictimai və yarış iş axını.",
    "section": "auth",
    "navigation": "",
    "capability": "login",
    "unavailableBehavior": "render",
    "indexable": false
  },
  {
    "id": "register",
    "path": "/register",
    "family": "AUTH",
    "title": "Komanda qeydiyyatı",
    "description": "Komanda qeydiyyatı — AEVIC ictimai və yarış iş axını.",
    "section": "auth",
    "navigation": "",
    "capability": "register",
    "unavailableBehavior": "render",
    "indexable": false
  },
  {
    "id": "forgot_password",
    "path": "/forgot-password",
    "family": "AUTH",
    "title": "Şifrənin bərpası",
    "description": "Şifrənin bərpası — AEVIC ictimai və yarış iş axını.",
    "section": "auth",
    "navigation": "",
    "capability": "passwordRecovery",
    "indexable": false
  },
  {
    "id": "reset_password",
    "path": "/reset-password",
    "family": "AUTH",
    "title": "Yeni şifrə",
    "description": "Yeni şifrə — AEVIC ictimai və yarış iş axını.",
    "section": "auth",
    "navigation": "",
    "capability": "passwordRecovery",
    "indexable": false
  },
  {
    "id": "verify_email",
    "path": "/verify-email",
    "family": "AUTH",
    "title": "Email təsdiqi",
    "description": "Email təsdiqi — AEVIC ictimai və yarış iş axını.",
    "section": "auth",
    "navigation": "",
    "capability": "passwordRecovery",
    "indexable": false
  },
  {
    "id": "unauthorized",
    "path": "/unauthorized",
    "family": "SYSTEM",
    "title": "Giriş tələb olunur",
    "description": "Giriş tələb olunur — AEVIC ictimai və yarış iş axını.",
    "section": "system",
    "navigation": "",
    "indexable": false
  },
  {
    "id": "session_expired",
    "path": "/session-expired",
    "family": "SYSTEM",
    "title": "Sessiya bitib",
    "description": "Sessiya bitib — AEVIC ictimai və yarış iş axını.",
    "section": "system",
    "navigation": "",
    "indexable": false
  },
  {
    "id": "account_locked",
    "path": "/account-locked",
    "family": "SYSTEM",
    "title": "Hesab kilidlənib",
    "description": "Hesab kilidlənib — AEVIC ictimai və yarış iş axını.",
    "section": "system",
    "navigation": "",
    "indexable": false
  },
  {
    "id": "too_many_attempts",
    "path": "/too-many-attempts",
    "family": "SYSTEM",
    "title": "Sorğu limiti",
    "description": "Sorğu limiti — AEVIC ictimai və yarış iş axını.",
    "section": "system",
    "navigation": "",
    "indexable": false
  },
  {
    "id": "forbidden",
    "path": "/forbidden",
    "family": "SYSTEM",
    "title": "İcazə yoxdur",
    "description": "İcazə yoxdur — AEVIC ictimai və yarış iş axını.",
    "section": "system",
    "navigation": "",
    "indexable": false
  },
  {
    "id": "admin_login",
    "path": "/admin/login",
    "family": "AUTH",
    "title": "Admin girişi",
    "description": "Admin girişi — AEVIC ictimai və yarış iş axını.",
    "section": "auth",
    "navigation": "",
    "capability": "login",
    "indexable": false
  },
  {
    "id": "team",
    "path": "/team",
    "family": "TEAM",
    "title": "Komanda icmalı",
    "description": "Komanda icmalı — AEVIC ictimai və yarış iş axını.",
    "section": "overview",
    "navigation": "",
    "capability": "teamWorkspace",
    "indexable": false
  },
  {
    "id": "team_tournaments",
    "path": "/team/tournaments",
    "family": "TEAM",
    "title": "Turnirlərim",
    "description": "Turnirlərim — AEVIC ictimai və yarış iş axını.",
    "section": "competition",
    "navigation": "",
    "capability": "teamWorkspace",
    "indexable": false
  },
  {
    "id": "team_tournaments_tournamentId",
    "path": "/team/tournaments/:tournamentId",
    "family": "TEAM",
    "title": "Turnir əməliyyatları",
    "description": "Turnir əməliyyatları — AEVIC ictimai və yarış iş axını.",
    "section": "competition",
    "navigation": "",
    "capability": "teamWorkspace",
    "indexable": false
  },
  {
    "id": "team_history",
    "path": "/team/history",
    "family": "TEAM",
    "title": "Komanda tarixçəsi",
    "description": "Komanda tarixçəsi — AEVIC ictimai və yarış iş axını.",
    "section": "career",
    "navigation": "",
    "capability": "teamWorkspace",
    "indexable": false
  },
  {
    "id": "team_comparison",
    "path": "/team/comparison",
    "family": "TEAM",
    "title": "Komanda müqayisəsi",
    "description": "Komanda müqayisəsi — AEVIC ictimai və yarış iş axını.",
    "section": "career",
    "navigation": "",
    "capability": "teamWorkspace",
    "indexable": false
  },
  {
    "id": "team_roster",
    "path": "/team/roster",
    "family": "TEAM",
    "title": "Heyət",
    "description": "Heyət — AEVIC ictimai və yarış iş axını.",
    "section": "roster",
    "navigation": "",
    "capability": "teamWorkspace",
    "indexable": false
  },
  {
    "id": "team_messages",
    "path": "/team/messages",
    "family": "TEAM",
    "title": "Mesajlar",
    "description": "Mesajlar — AEVIC ictimai və yarış iş axını.",
    "section": "communication",
    "navigation": "",
    "capability": "teamWorkspace",
    "indexable": false
  },
  {
    "id": "team_notifications",
    "path": "/team/notifications",
    "family": "TEAM",
    "title": "Bildirişlər",
    "description": "Bildirişlər — AEVIC ictimai və yarış iş axını.",
    "section": "communication",
    "navigation": "",
    "capability": "teamWorkspace",
    "indexable": false
  },
  {
    "id": "team_roster_requests",
    "path": "/team/roster-requests",
    "family": "TEAM",
    "title": "Heyət sorğuları",
    "description": "Heyət sorğuları — AEVIC ictimai və yarış iş axını.",
    "section": "roster",
    "navigation": "",
    "capability": "teamWorkspace",
    "indexable": false
  },
  {
    "id": "team_roster_requests_requestId",
    "path": "/team/roster-requests/:requestId",
    "family": "TEAM",
    "title": "Heyət sorğusu",
    "description": "Heyət sorğusu — AEVIC ictimai və yarış iş axını.",
    "section": "roster",
    "navigation": "",
    "capability": "teamWorkspace",
    "indexable": false
  },
  {
    "id": "team_disputes",
    "path": "/team/disputes",
    "family": "TEAM",
    "title": "Nəticə etirazları",
    "description": "Nəticə etirazları — AEVIC ictimai və yarış iş axını.",
    "section": "communication",
    "navigation": "",
    "capability": "teamWorkspace",
    "indexable": false
  },
  {
    "id": "team_disputes_new",
    "path": "/team/disputes/new",
    "family": "TEAM",
    "title": "Yeni etiraz",
    "description": "Yeni etiraz — AEVIC ictimai və yarış iş axını.",
    "section": "communication",
    "navigation": "",
    "capability": "teamWorkspace",
    "indexable": false
  },
  {
    "id": "team_disputes_disputeId",
    "path": "/team/disputes/:disputeId",
    "family": "TEAM",
    "title": "Etiraz detalı",
    "description": "Etiraz detalı — AEVIC ictimai və yarış iş axını.",
    "section": "communication",
    "navigation": "",
    "capability": "teamWorkspace",
    "indexable": false
  },
  {
    "id": "team_sharecards",
    "path": "/team/sharecards",
    "family": "TEAM",
    "title": "Paylaşım studiyası",
    "description": "Paylaşım studiyası — AEVIC ictimai və yarış iş axını.",
    "section": "career",
    "navigation": "",
    "capability": "teamWorkspace",
    "indexable": false
  },
  {
    "id": "team_badges",
    "path": "/team/badges",
    "family": "TEAM",
    "title": "Nişan kabineti",
    "description": "Nişan kabineti — AEVIC ictimai və yarış iş axını.",
    "section": "career",
    "navigation": "",
    "capability": "teamWorkspace",
    "indexable": false
  },
  {
    "id": "team_badges_badgeId",
    "path": "/team/badges/:badgeId",
    "family": "TEAM",
    "title": "Nişan detalı",
    "description": "Nişan detalı — AEVIC ictimai və yarış iş axını.",
    "section": "career",
    "navigation": "",
    "capability": "teamWorkspace",
    "indexable": false
  },
  {
    "id": "team_invitations",
    "path": "/team/invitations",
    "family": "TEAM",
    "title": "Dəvətlər",
    "description": "Dəvətlər — AEVIC ictimai və yarış iş axını.",
    "section": "roster",
    "navigation": "",
    "capability": "teamWorkspace",
    "indexable": false
  },
  {
    "id": "team_settings_managers",
    "path": "/team/settings/managers",
    "family": "TEAM",
    "title": "Menecerlər",
    "description": "Menecerlər — AEVIC ictimai və yarış iş axını.",
    "section": "management",
    "navigation": "",
    "capability": "teamWorkspace",
    "indexable": false
  },
  {
    "id": "team_verification",
    "path": "/team/verification",
    "family": "TEAM",
    "title": "Komanda təsdiqi",
    "description": "Komanda təsdiqi — AEVIC ictimai və yarış iş axını.",
    "section": "management",
    "navigation": "",
    "capability": "teamWorkspace",
    "indexable": false
  },
  {
    "id": "team_organization_organizationSlug",
    "path": "/team/organization/:organizationSlug",
    "family": "TEAM",
    "title": "Təşkilat iş sahəsi",
    "description": "Təşkilat iş sahəsi — AEVIC ictimai və yarış iş axını.",
    "section": "management",
    "navigation": "",
    "capability": "teamWorkspace",
    "indexable": false
  },
  {
    "id": "team_settings",
    "path": "/team/settings",
    "family": "TEAM",
    "title": "Komanda ayarları",
    "description": "Komanda ayarları — AEVIC ictimai və yarış iş axını.",
    "section": "management",
    "navigation": "",
    "capability": "teamWorkspace",
    "indexable": false
  },
  {
    "id": "admin",
    "path": "/admin",
    "family": "ADMIN",
    "title": "Diqqət tələb edənlər",
    "description": "Diqqət tələb edənlər — AEVIC ictimai və yarış iş axını.",
    "section": "operations",
    "navigation": "",
    "capability": "adminWorkspace",
    "indexable": false
  },
  {
    "id": "admin_tournaments",
    "path": "/admin/tournaments",
    "family": "ADMIN",
    "title": "Turnirlər",
    "description": "Turnirlər — AEVIC ictimai və yarış iş axını.",
    "section": "competition",
    "navigation": "",
    "capability": "adminWorkspace",
    "indexable": false
  },
  {
    "id": "admin_tournaments_new",
    "path": "/admin/tournaments/new",
    "family": "ADMIN",
    "title": "Yeni turnir",
    "description": "Yeni turnir — AEVIC ictimai və yarış iş axını.",
    "section": "competition",
    "navigation": "",
    "capability": "adminWorkspace",
    "indexable": false
  },
  {
    "id": "admin_tournaments_tournamentId",
    "path": "/admin/tournaments/:tournamentId",
    "family": "ADMIN",
    "title": "Turnir əməliyyatları",
    "description": "Turnir əməliyyatları — AEVIC ictimai və yarış iş axını.",
    "section": "competition",
    "navigation": "",
    "capability": "adminWorkspace",
    "indexable": false
  },
  {
    "id": "admin_tournaments_tournamentId_lifecycle",
    "path": "/admin/tournaments/:tournamentId/lifecycle",
    "family": "ADMIN",
    "title": "Turnir həyat dövrü",
    "description": "Turnir həyat dövrü — AEVIC ictimai və yarış iş axını.",
    "section": "competition",
    "navigation": "",
    "capability": "adminWorkspace",
    "indexable": false
  },
  {
    "id": "admin_check_ins_missed",
    "path": "/admin/check-ins/missed",
    "family": "ADMIN",
    "title": "Buraxılmış check-in",
    "description": "Buraxılmış check-in — AEVIC ictimai və yarış iş axını.",
    "section": "operations",
    "navigation": "",
    "capability": "adminWorkspace",
    "indexable": false
  },
  {
    "id": "admin_teams",
    "path": "/admin/teams",
    "family": "ADMIN",
    "title": "Komandalar",
    "description": "Komandalar — AEVIC ictimai və yarış iş axını.",
    "section": "organizations",
    "navigation": "",
    "capability": "adminWorkspace",
    "indexable": false
  },
  {
    "id": "admin_teams_teamId",
    "path": "/admin/teams/:teamId",
    "family": "ADMIN",
    "title": "Komanda yoxlaması",
    "description": "Komanda yoxlaması — AEVIC ictimai və yarış iş axını.",
    "section": "organizations",
    "navigation": "",
    "capability": "adminWorkspace",
    "indexable": false
  },
  {
    "id": "admin_organizations",
    "path": "/admin/organizations",
    "family": "ADMIN",
    "title": "Təşkilatlar",
    "description": "Təşkilatlar — AEVIC ictimai və yarış iş axını.",
    "section": "organizations",
    "navigation": "",
    "capability": "adminWorkspace",
    "indexable": false
  },
  {
    "id": "admin_results",
    "path": "/admin/results",
    "family": "ADMIN",
    "title": "Nəticələr",
    "description": "Nəticələr — AEVIC ictimai və yarış iş axını.",
    "section": "competition",
    "navigation": "",
    "capability": "adminWorkspace",
    "indexable": false
  },
  {
    "id": "admin_results_resultId_correct",
    "path": "/admin/results/:resultId/correct",
    "family": "ADMIN",
    "title": "Nəticə düzəlişi",
    "description": "Nəticə düzəlişi — AEVIC ictimai və yarış iş axını.",
    "section": "competition",
    "navigation": "",
    "capability": "adminWorkspace",
    "indexable": false
  },
  {
    "id": "admin_messages",
    "path": "/admin/messages",
    "family": "ADMIN",
    "title": "Mesajlar",
    "description": "Mesajlar — AEVIC ictimai və yarış iş axını.",
    "section": "moderation",
    "navigation": "",
    "capability": "adminWorkspace",
    "indexable": false
  },
  {
    "id": "admin_blacklist",
    "path": "/admin/blacklist",
    "family": "ADMIN",
    "title": "Qara siyahı",
    "description": "Qara siyahı — AEVIC ictimai və yarış iş axını.",
    "section": "moderation",
    "navigation": "",
    "capability": "adminWorkspace",
    "indexable": false
  },
  {
    "id": "admin_roster_requests",
    "path": "/admin/roster-requests",
    "family": "ADMIN",
    "title": "Heyət növbəsi",
    "description": "Heyət növbəsi — AEVIC ictimai və yarış iş axını.",
    "section": "operations",
    "navigation": "",
    "capability": "adminWorkspace",
    "indexable": false
  },
  {
    "id": "admin_roster_requests_requestId",
    "path": "/admin/roster-requests/:requestId",
    "family": "ADMIN",
    "title": "Heyət sorğusu",
    "description": "Heyət sorğusu — AEVIC ictimai və yarış iş axını.",
    "section": "operations",
    "navigation": "",
    "capability": "adminWorkspace",
    "indexable": false
  },
  {
    "id": "admin_disputes",
    "path": "/admin/disputes",
    "family": "ADMIN",
    "title": "Etiraz növbəsi",
    "description": "Etiraz növbəsi — AEVIC ictimai və yarış iş axını.",
    "section": "operations",
    "navigation": "",
    "capability": "adminWorkspace",
    "indexable": false
  },
  {
    "id": "admin_disputes_disputeId",
    "path": "/admin/disputes/:disputeId",
    "family": "ADMIN",
    "title": "Etiraz detalı",
    "description": "Etiraz detalı — AEVIC ictimai və yarış iş axını.",
    "section": "operations",
    "navigation": "",
    "capability": "adminWorkspace",
    "indexable": false
  },
  {
    "id": "admin_players_playerId",
    "path": "/admin/players/:playerId",
    "family": "ADMIN",
    "title": "Oyunçu yoxlaması",
    "description": "Oyunçu yoxlaması — AEVIC ictimai və yarış iş axını.",
    "section": "organizations",
    "navigation": "",
    "capability": "adminWorkspace",
    "indexable": false
  },
  {
    "id": "admin_verifications",
    "path": "/admin/verifications",
    "family": "ADMIN",
    "title": "Təsdiq növbəsi",
    "description": "Təsdiq növbəsi — AEVIC ictimai və yarış iş axını.",
    "section": "organizations",
    "navigation": "",
    "capability": "adminWorkspace",
    "indexable": false
  },
  {
    "id": "admin_verifications_verificationId",
    "path": "/admin/verifications/:verificationId",
    "family": "ADMIN",
    "title": "Təsdiq detalı",
    "description": "Təsdiq detalı — AEVIC ictimai və yarış iş axını.",
    "section": "organizations",
    "navigation": "",
    "capability": "adminWorkspace",
    "indexable": false
  },
  {
    "id": "admin_support",
    "path": "/admin/support",
    "family": "ADMIN",
    "title": "Dəstək növbəsi",
    "description": "Dəstək növbəsi — AEVIC ictimai və yarış iş axını.",
    "section": "support",
    "navigation": "",
    "capability": "adminWorkspace",
    "indexable": false
  },
  {
    "id": "admin_audit",
    "path": "/admin/audit",
    "family": "ADMIN",
    "title": "Audit jurnalı",
    "description": "Audit jurnalı — AEVIC ictimai və yarış iş axını.",
    "section": "system",
    "navigation": "",
    "capability": "adminWorkspace",
    "indexable": false
  },
  {
    "id": "admin_users",
    "path": "/admin/users",
    "family": "ADMIN",
    "title": "Admin istifadəçiləri",
    "description": "Admin istifadəçiləri — AEVIC ictimai və yarış iş axını.",
    "section": "system",
    "navigation": "",
    "capability": "adminWorkspace",
    "indexable": false
  },
  {
    "id": "admin_settings",
    "path": "/admin/settings",
    "family": "ADMIN",
    "title": "Parametrlər",
    "description": "Parametrlər — AEVIC ictimai və yarış iş axını.",
    "section": "system",
    "navigation": "",
    "capability": "adminWorkspace",
    "indexable": false
  },
  {
    "id": "account",
    "path": "/account",
    "family": "ACCOUNT",
    "title": "Hesab profili",
    "description": "Hesab profili — AEVIC ictimai və yarış iş axını.",
    "section": "account",
    "navigation": "",
    "capability": "teamWorkspace",
    "indexable": false
  },
  {
    "id": "account_profile",
    "path": "/account/profile",
    "family": "ACCOUNT",
    "title": "Hesab profili",
    "description": "Hesab profili — AEVIC ictimai və yarış iş axını.",
    "section": "account",
    "navigation": "",
    "capability": "teamWorkspace",
    "indexable": false
  },
  {
    "id": "account_security",
    "path": "/account/security",
    "family": "ACCOUNT",
    "title": "Hesab təhlükəsizliyi",
    "description": "Hesab təhlükəsizliyi — AEVIC ictimai və yarış iş axını.",
    "section": "account",
    "navigation": "",
    "capability": "teamWorkspace",
    "indexable": false
  },
  {
    "id": "account_notifications",
    "path": "/account/notifications",
    "family": "ACCOUNT",
    "title": "Bildiriş ayarları",
    "description": "Bildiriş ayarları — AEVIC ictimai və yarış iş axını.",
    "section": "account",
    "navigation": "",
    "capability": "teamWorkspace",
    "indexable": false
  },
  {
    "id": "account_sessions",
    "path": "/account/sessions",
    "family": "ACCOUNT",
    "title": "Hesab sessiyaları",
    "description": "Hesab sessiyaları — AEVIC ictimai və yarış iş axını.",
    "section": "account",
    "navigation": "",
    "capability": "teamWorkspace",
    "indexable": false
  },
  {
    "id": "account_player_claim_playerId",
    "path": "/account/player/claim/:playerId",
    "family": "ACCOUNT",
    "title": "Oyunçu kimliyinin təsdiqi",
    "description": "Oyunçu kimliyinin təsdiqi — AEVIC ictimai və yarış iş axını.",
    "section": "account",
    "navigation": "",
    "capability": "teamWorkspace",
    "indexable": false
  },
  {
    "id": "account_support_tickets",
    "path": "/account/support/tickets",
    "family": "ACCOUNT",
    "title": "Dəstək sorğularım",
    "description": "Dəstək sorğularım — AEVIC ictimai və yarış iş axını.",
    "section": "account",
    "navigation": "",
    "capability": "teamWorkspace",
    "indexable": false
  },
  {
    "id": "account_support_tickets_new",
    "path": "/account/support/tickets/new",
    "family": "ACCOUNT",
    "title": "Yeni dəstək sorğusu",
    "description": "Yeni dəstək sorğusu — AEVIC ictimai və yarış iş axını.",
    "section": "account",
    "navigation": "",
    "capability": "teamWorkspace",
    "indexable": false
  },
  {
    "id": "account_support_tickets_ticketId",
    "path": "/account/support/tickets/:ticketId",
    "family": "ACCOUNT",
    "title": "Dəstək sorğusu",
    "description": "Dəstək sorğusu — AEVIC ictimai və yarış iş axını.",
    "section": "account",
    "navigation": "",
    "capability": "teamWorkspace",
    "indexable": false
  }
] as const satisfies readonly RouteDefinition[];

export function routePath(id: typeof routeManifest[number]['id'], parent = '') {
  const route = routeManifest.find((item) => item.id === id)!;
  return parent ? route.path.slice(parent.length + 1) : route.path;
}
export function matchRoute(pathname: string): RouteDefinition | undefined {
  const clean = pathname.replace(/\/$/, '') || '/';
  const candidates = routeManifest.filter((item) => item.path !== '*').map((item) => ({ item, parts: item.path.split('/') }));
  return candidates.filter(({ parts }) => parts.length === clean.split('/').length && parts.every((part, index) => part.startsWith(':') ? Boolean(clean.split('/')[index]) : part === clean.split('/')[index])).sort((a, b) => a.parts.filter((p) => p.startsWith(':')).length - b.parts.filter((p) => p.startsWith(':')).length)[0]?.item;
}
export function routeIsAvailable(route: RouteDefinition, capabilities: ServiceCapabilities) {
  return !route.capability || capabilities[route.capability];
}

/** Only explicitly safe public pages may render without their backend. */
export function routeIsAccessible(route: RouteDefinition, capabilities: ServiceCapabilities) {
  return routeIsAvailable(route, capabilities) || route.unavailableBehavior === 'render';
}
