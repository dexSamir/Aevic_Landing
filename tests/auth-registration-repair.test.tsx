import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RegisterPage } from '../src/pages/AuthPages';
import { RegistrationTeamPreview } from '../src/components/auth/RegistrationElements';
import { serviceCapabilities, services } from '../src/services';
import { createServiceCapabilities } from '../src/services/capabilities';

const players = Array.from({ length: 5 }, (_, index) => ({ ign: `Player ${index + 1}`, uid: `512345678${index}`, role: index === 0 ? 'captain' as const : index === 4 ? 'substitute' as const : 'starter' as const }));
beforeEach(() => { sessionStorage.clear(); Object.assign(serviceCapabilities, createServiceCapabilities('api'), {register:false}); });
afterEach(() => { Object.assign(serviceCapabilities, createServiceCapabilities('mock')); vi.restoreAllMocks(); });

describe('registration repair', () => {
  it('progressively exposes only public team identity in the preview', () => {
    const props = { teamName: 'Test team', tag: 'TEST', captainName: 'Murad Aliyev', players, tournamentName: 'AEVIC' };
    const view = render(<RegistrationTeamPreview {...props} step={1} />);
    expect(screen.queryByText('Murad Aliyev')).not.toBeInTheDocument();
    view.rerender(<RegistrationTeamPreview {...props} step={2} />);
    expect(screen.getByText('Murad Aliyev')).toBeInTheDocument();
    expect(screen.queryByText('Player 1')).not.toBeInTheDocument();
    view.rerender(<RegistrationTeamPreview {...props} step={3} />);
    expect(screen.getByText('Player 5')).toBeInTheDocument();
    expect(screen.getByText('Ehtiyat')).toBeInTheDocument();
    view.rerender(<RegistrationTeamPreview {...props} step={4} ready={false} />);
    expect(screen.getByText('Məlumatlar tamamlanmalıdır')).toBeInTheDocument();
    expect(screen.getByText('Qaralama · hələ göndərilməyib')).toBeInTheDocument();
  });

  it('keeps review editing, terms semantics and unavailable submission independent', () => {
    const submit = vi.spyOn(services.registration, 'submit');
    const view = render(<MemoryRouter><RegisterPage /></MemoryRouter>);
    const change = (id: string, value: string) => fireEvent.change(view.container.querySelector(`#${id}`)!, { target: { value } });
    const next = () => fireEvent.submit(view.container.querySelector('form')!);
    change('teamName', 'Test team'); change('tag', 'TEST'); next();
    change('firstName', 'Murad'); change('lastName', 'Aliyev'); change('phone', '501234567'); change('email', 'private@example.test'); change('password', 'Password123'); change('confirmation', 'Password123'); next();
    players.slice(0,4).forEach((player, index) => {
      if (index > 0) fireEvent.click(view.container.querySelector(`#roster-player-${index}-trigger`)!);
      change(`player-${index}-ign`, player.ign); change(`player-${index}-uid`, player.uid);
    });
    next();
    expect(screen.getByRole('heading', { name: 'Yekun icmal' })).toBeInTheDocument();
    const preview = screen.getByRole('complementary');
    expect(within(preview).queryByText('private@example.test')).not.toBeInTheDocument();
    const terms = screen.getByRole('checkbox');
    const link = screen.getByRole('link', { name: /Turnir qaydalarını oxu/ });
    expect(link.closest('label')).toBeNull();
    expect(link).toHaveAttribute('href', '/regulations');
    fireEvent.click(terms);
    expect(terms).toBeChecked();
    next();
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByText(/Qaralama saxlanıldı. İctimai baxış rejimində son qeydiyyat/)).toBeInTheDocument();
    fireEvent.click(within(view.container.querySelector('.registration-review-group')!).getByRole('button', { name: 'Düzəliş et' }));
    expect(screen.getByLabelText('Komanda adı')).toHaveValue('Test team');
  });
});
