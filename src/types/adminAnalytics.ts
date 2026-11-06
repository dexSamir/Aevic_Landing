export type AnalyticsRange = '7' | '30' | '90' | 'all';
export interface AnalyticsPoint {
  date: string;
  tournaments: number;
  completions: number;
  teams: number;
  registrations: number;
  publishedRounds: number;
  publishedResults: number;
}
export interface AdminAnalytics {
  generatedAt: string;
  timezone: 'Asia/Baku';
  range: AnalyticsRange;
  granularity: 'day' | 'week' | 'month';
  start: string;
  totals: {
    tournaments: number; completed: number; active: number; teams: number;
    registrations: number; playedRounds: number; pendingApprovals: number; publishedResults: number;
    pendingTeams: number; pendingRegistrations: number; pendingVerifications: number; pendingRosters: number;
  };
  period: { tournaments: number; completions: number; teams: number; registrations: number; uniqueTeams: number; publishedRounds: number; publishedResults: number };
  series: AnalyticsPoint[];
  lifecycle: Array<{ status: string; count: number }>;
  upcoming: AnalyticsTournament[];
  completed: AnalyticsTournament[];
  attention: AnalyticsTournament[];
  approvals: Array<{ id: string; name: string; kind: 'team' | 'registration'; createdAt: string; href: string }>;
  activity: Array<{ id: string; action: string; createdAt: string; href: string }>;
}
export interface AnalyticsTournament { id: string; name: string; status: string; startsAt: string; occupied: number; capacity: number; rounds: number; published: number }
