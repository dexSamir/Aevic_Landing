import { createApiServices } from './apiAdapter';
import { mockServices } from './mockAdapter';

export function createRuntimeServices(dataSource: 'api' | 'mock', apiBaseUrl: string) {
  return dataSource === 'api' ? createApiServices(apiBaseUrl) : mockServices;
}
