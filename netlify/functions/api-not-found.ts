import { jsonResponse, requestIdFrom } from './_shared/http';

export default async function apiNotFound(request: Request) {
  const response = jsonResponse({
    code: 'API_ROUTE_NOT_FOUND',
    message: 'Soruşulan API marşrutu mövcud deyil.',
    requestId: requestIdFrom(request),
  }, 404, { 'cache-control': 'no-store' });
  return request.method === 'HEAD' ? new Response(null, { status: response.status, headers: response.headers }) : response;
}
