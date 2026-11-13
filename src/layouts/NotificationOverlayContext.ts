import { createContext } from 'react';

/** Layout owns the navigation; a mounted notification sheet claims it until dismissal. */
export const NotificationOverlayContext = createContext<(open: boolean) => void>(() => {});
