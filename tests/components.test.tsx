import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { TournamentJoinAction } from '../src/components/competition/TournamentJoinAction';
import { AccessStatePage } from '../src/pages/AuthLifecyclePages';
import { AccountSecurityPage, AccountSessionsPage } from '../src/pages/AccountPages';
import { services } from '../src/services';
import { SupportCenterPage } from '../src/pages/SupportPages';
import { tournaments } from '../src/mocks/data';

describe('auth and account lifecycle', () => {
  it('gives a rate-limited user a clear wait and recovery path', () => {
    render(<MemoryRouter><AccessStatePage state="rate-limited" /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /çox sayda cəhd/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /dəstək mərkəzi/i })).toHaveAttribute('href', '/support');
  });

  it('does not fabricate a TOTP secret when the backend has no setup capability', async () => {
    render(<MemoryRouter><AccountSecurityPage /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: /server xidməti tələb olunur/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /2fa-nı aktiv et/i })).toBeDisabled();
    expect(screen.queryByAltText(/totp qr/i)).not.toBeInTheDocument();
  });

  it('keeps account confirmation pending until its mutation settles and reports rejection', async () => {
    const user = userEvent.setup();
    let reject!: (reason: Error) => void;
    const revoke = vi.spyOn(services.account, 'revokeOtherSessions').mockImplementation(() => new Promise<void>((_, fail) => { reject = fail; }));
    try {
      render(<MemoryRouter><AccountSessionsPage /></MemoryRouter>);
      await user.click(screen.getByRole('button', { name: 'Digər hamısından çıx', exact: true }));
      const confirm = screen.getByRole('button', { name: 'Hamısından çıx', exact: true });
      await user.dblClick(confirm);
      expect(revoke).toHaveBeenCalledTimes(1);
      expect(confirm).toBeDisabled();
      await act(async () => { reject(new Error('Rejected test mutation')); });
      expect(await screen.findByRole('alert')).toHaveTextContent('Əməliyyat təsdiqlənmədi');
      expect(confirm).not.toBeDisabled();
    } finally { revoke.mockRestore(); }
  });
});

describe('competition and support states', () => {
  it('resolves the tournament join action from session, team, roster, slots, and status', async () => {
    render(<MemoryRouter><TournamentJoinAction tournament={tournaments[0]} /></MemoryRouter>);
    expect(await screen.findByRole('button', { name: /qeydiyyatdan keçib/i })).toBeDisabled();
  });

  it('filters support answers without losing the ticket recovery action', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><SupportCenterPage /></MemoryRouter>);
    await user.type(screen.getByRole('textbox', { name: /dəstək mövzularında axtar/i }), 'room');
    expect(screen.getByText(/otaq kodunu harada/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ticket yarat/i })).toHaveAttribute('href', '/account/support/tickets/new');
  });
});
