import {defineConfig} from '@playwright/test';
import base from './playwright.integration.config';
export default defineConfig(base,{testMatch:'legacy-claim.spec.ts'});
