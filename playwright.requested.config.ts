import config from './playwright.config';
export default {...config, use:{...config.use,screenshot:'off',trace:'off',video:'off'},projects:[config.projects![0]],testMatch:['requested-responsive-refinements.spec.ts','critical-flows.spec.ts']};
