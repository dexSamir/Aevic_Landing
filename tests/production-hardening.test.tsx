import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProtectedRoute, PublicHeader } from '../src/layouts/layouts';
import { createServiceCapabilities } from '../src/services/capabilities';
import { services, serviceCapabilities } from '../src/services';
import { ApiError } from '../src/services/apiError';

vi.mock('../src/services', async (original) => {
 const actual = await original<typeof import('../src/services')>();
 return { ...actual, serviceCapabilities: { ...actual.serviceCapabilities } };
});
afterEach(() => { Object.assign(serviceCapabilities, createServiceCapabilities('mock')); vi.restoreAllMocks(); });
const session = {user: {id:'test-user', firstName:'Owner', lastName:'Test', email:'owner@example.test', role:'visitor' as const}, role:'visitor' as const};

describe('production account recovery', () => {
 it('keeps a failed logout visible and offers a retry without an unhandled rejection', async () => {
  vi.spyOn(services.auth,'getSession').mockResolvedValue(session);
  const logout=vi.spyOn(services.auth,'logout').mockRejectedValue(new ApiError({status:503,kind:'server'}));
  render(<MemoryRouter><PublicHeader /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button',{name:'Owner hesab menyusu'}));
  expect(screen.getByRole('menuitem',{name:'Ayarlar'})).toHaveAttribute('href','/account/security');
  fireEvent.click(screen.getByRole('menuitem',{name:'Çıxış'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Çıxış tamamlanmadı');
  expect(screen.getByRole('menuitem',{name:'Çıxış'})).toBeEnabled();
  expect(logout).toHaveBeenCalledTimes(1);
 });
 it('retries an unavailable session check on the current route and restores protected content',async()=>{
  Object.assign(serviceCapabilities,createServiceCapabilities('api'));
  const getSession=vi.spyOn(services.auth,'getSession').mockRejectedValueOnce(new ApiError({status:503,kind:'server'})).mockResolvedValue(session);
  render(<MemoryRouter initialEntries={['/account/profile']}><ProtectedRoute area="account"><h1>Private account</h1></ProtectedRoute></MemoryRouter>);
  expect(await screen.findByRole('heading',{name:'Bağlantını yoxlayın'})).toBeInTheDocument();
  expect(screen.queryByRole('heading',{name:'Private account'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Yenidən yoxla'}));
  expect(await screen.findByRole('heading',{name:'Private account'})).toBeInTheDocument();
  expect(getSession).toHaveBeenCalledTimes(2);
 });
});
