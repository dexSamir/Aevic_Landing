import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { ForgotPasswordPage } from '../src/pages/routes/ForgotPasswordPage';
import { ResetPasswordPage } from '../src/pages/routes/ResetPasswordPage';
import { services } from '../src/services';
import { ApiError, apiErrorFromResponse } from '../src/services/apiError';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); window.history.replaceState(null, '', '/'); });
it('prevents duplicate requests and waits for the backend 60-second resend window', async () => {
  vi.useFakeTimers();
  let finish!: () => void;
  const request = vi.spyOn(services.auth, 'requestPasswordReset').mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
  const view = render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('E-poçt'), { target: { value: 'fixture@example.test' } });
  const form = view.container.querySelector('form')!;
  fireEvent.submit(form); fireEvent.submit(form);
  expect(request).toHaveBeenCalledTimes(1);
  await act(async () => finish());
  expect(screen.getByText('Bərpa sorğusu qəbul edildi.')).toBeVisible();
  expect(screen.getByRole('button', { name: /Yenidən göndər/ })).toBeDisabled();
  act(() => vi.advanceTimersByTime(59000));
  expect(screen.getByRole('button', { name: /Yenidən göndər/ })).toBeDisabled();
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByRole('button', { name: /Yenidən göndər/ })).toBeEnabled();
});
it('honors a longer provider Retry-After without claiming receipt', async () => {
  vi.spyOn(services.auth, 'requestPasswordReset').mockRejectedValue(new ApiError({ status: 429, kind: 'rate-limit', retryAfterMs: 120000 }));
  const view = render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('E-poçt'), { target: { value: 'fixture@example.test' } });
  fireEvent.submit(view.container.querySelector('form')!);
  expect(await screen.findByRole('alert')).toHaveTextContent('Çox sayda sorğu');
  expect(screen.getByRole('button', { name: 'Yenidən cəhd · 120s' })).toBeDisabled();
  expect(screen.queryByText('Bərpa sorğusu qəbul edildi.')).not.toBeInTheDocument();
});
it('offers a fresh link when a previously valid token is replaced before confirmation', async () => {
  window.history.replaceState(null, '', '/reset-password#token=fixture');
  vi.spyOn(services.auth, 'inspectPasswordReset').mockResolvedValue({ state: 'valid' });
  const error = await apiErrorFromResponse(new Response(JSON.stringify({code:'INVALID_RECOVERY_TOKEN'}), {status:422,headers:{'content-type':'application/json'}}));
  vi.spyOn(services.auth, 'resetPassword').mockRejectedValue(error);
  const view = render(<MemoryRouter><ResetPasswordPage /></MemoryRouter>);
  fireEvent.change(await screen.findByLabelText('Yeni şifrə'), {target:{value:'Password123'}});
  fireEvent.change(screen.getByLabelText('Şifrəni təsdiqlə'), {target:{value:'Password123'}});
  fireEvent.submit(view.container.querySelector('form')!);
  expect(await screen.findByRole('link', {name:'Yeni bərpa linki istə'})).toHaveAttribute('href', '/forgot-password');
  expect(window.location.hash).toBe('');
});
