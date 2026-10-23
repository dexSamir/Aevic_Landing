import config from './playwright.config';
export default {...config,use:{...config.use,screenshot:'off',trace:'off',video:'off'},projects:[config.projects![0]],testMatch:['google-oauth-navigation.spec.ts']};
