import type { ServerConfig } from './config';
import { createHttpApp } from './http';
import production from './routes/production';
import {captainRoutes,type CaptainDependencies} from './routes/captain';
import {platformMiddleware} from './platform/middleware';
import adminManagementRoutes from './platform/admin-management';
import legacyClaimRoutes from './platform/legacy-claims';
import activationRoutes from './platform/activation';
import authorityRoutes from './platform/authority';
import organizationRoutes from './platform/organizations';
import playerRoutes from './platform/players';
import platformRoutes from './platform/routes';
import communityRoutes from './platform/community';
import accountRoutes from './platform/account';
import verificationRoutes from './platform/verification';
import publicRoutes from './routes/public';
import staffRoutes from './platform/staff';
import profileRoutes from './platform/profile';
import adminRecoveryRoutes from './platform/admin-recovery';
import mediaRoutes from './platform/media';
import rosterRoutes from './platform/roster';
import identityRoutes from './platform/identity';
import registrationRoutes from './platform/registration';
import mfaRoutes from './platform/mfa';
import adminAccountRoutes from './platform/admin-account';

export function createApp(config?:ServerConfig, env: NodeJS.ProcessEnv = process.env, captainDependencies:CaptainDependencies = {}) {
 const app=createHttpApp(config,env);
 const platformEnabled=Boolean(config?.databaseUrl??env.AEVIC_DATABASE_URL);
 if(platformEnabled){
  app.route('/',platformMiddleware());
  app.route('/',activationRoutes);
  app.route('/',legacyClaimRoutes);
  app.route('/',authorityRoutes);
  app.route('/',adminManagementRoutes);
  app.route('/',platformRoutes);
  app.route('/',adminRecoveryRoutes);
  app.route('/',mediaRoutes);
  app.route('/',rosterRoutes);
  app.route('/',identityRoutes);
  app.route('/',playerRoutes);
  app.route('/',organizationRoutes);
  app.route('/',registrationRoutes);
  app.route('/',adminAccountRoutes);
  app.route('/',mfaRoutes);
  app.route('/',communityRoutes);
  app.route('/',staffRoutes);
  app.route('/',profileRoutes);
  app.route('/',accountRoutes);
  app.route('/',verificationRoutes);
 }
 app.route('/',captainRoutes(captainDependencies));
 app.route('/',platformEnabled?publicRoutes:production);
 return app;
}
