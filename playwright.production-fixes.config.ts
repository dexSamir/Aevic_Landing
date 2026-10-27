import config from './playwright.config';
export default { ...config, use: { ...config.use, screenshot: 'off' as const, trace: 'off' as const, video: 'off' as const }, projects: [config.projects![0]], testMatch: ['production-fixes.spec.ts', 'results-roster-refinement.spec.ts'] };
