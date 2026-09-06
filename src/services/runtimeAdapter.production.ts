import { createApiServices } from './apiAdapter';

export function createRuntimeServices(dataSource: 'api' | 'mock', apiBaseUrl: string) {
  if (dataSource !== 'api') throw new Error('Unsafe production configuration: mock services are unavailable.');
  return createApiServices(apiBaseUrl);
}
