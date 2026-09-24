import { lazy } from 'react';

export const LazyProfileCardGenerator = lazy(async () => ({ default: (await import('../../components/profile/ProfileCardGenerator')).ProfileCardGenerator }));
export const LazySharecardGenerator = lazy(async () => ({ default: (await import('../../components/competition/SharecardGenerator')).SharecardGenerator }));
