import { currentTeam } from '../src/mocks/data';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamPlatformProvider, useTeamPlatformData } from '../src/services/PlatformDataContext';
import { services } from '../src/services';
import { clearQueryCache } from '../src/services/queryCache';
import { TeamProfilePage } from '../src/pages/TeamProfilePage';
import { TeamSettingsPage } from '../src/pages/TeamSettingsPage';
import { NotificationCenterPage } from '../src/pages/TeamOperationsPages';
import { TeamGovernancePage } from '../src/pages/TeamManagementPage';

beforeEach(() => clearQueryCache('all'));
const mount = (page: React.ReactNode) => render(<MemoryRouter><TeamPlatformProvider>{page}</TeamPlatformProvider></MemoryRouter>);

describe('workspace acknowledged persistence and authority', () => {
  it('keeps identity local and never reports a failed social write as saved', async () => {
    const update = vi.spyOn(services.teams, 'updateSocialLinks').mockRejectedValue(new Error('unavailable'));
    mount(<TeamProfilePage />);
    fireEvent.change(await screen.findByLabelText('Komanda adı'), { target: { value: 'Local draft' } });
    expect(screen.getByRole('heading', { name: 'Local draft' })).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox', { name: /Instagram/ }), { target: { value: 'https://instagram.com/team' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sosial linkləri saxla' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sosial linklər saxlanılmadı');
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][1]).not.toHaveProperty('name');
    expect(update.mock.calls[0][1]).not.toHaveProperty('matches');
    expect(screen.queryByText('Sosial linklər nümunə sessiyasında saxlanıldı.')).not.toBeInTheDocument();
  });
  it('uses the existing preference contract and preserves channel values', async () => {
    const preferences = { channels: { 'in-app': true, email: false, push: false }, events: { checkIn: true, roomRelease: true } };
    vi.spyOn(services.notifications, 'preferences').mockResolvedValue(preferences);
    const save = vi.spyOn(services.notifications, 'updatePreferences').mockImplementation(async value => value);
    mount(<TeamSettingsPage />);
    fireEvent.click(await screen.findByRole('switch', { name: 'Check-in' }));
    fireEvent.click(screen.getByRole('button', { name: 'Seçimləri saxla' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith({ ...preferences, events: { checkIn: false, roomRelease: true } }));
    expect(await screen.findByRole('status')).toHaveTextContent('saxlanıldı');
  });
  it('updates shared notification state only after acknowledgement without refetching', async () => {
    const snapshot = await services.snapshots.team();
    const unread = { ...snapshot.notifications[0], read: false };
    const read = vi.spyOn(services.snapshots, 'team').mockResolvedValue({ ...snapshot, notifications: [unread] });
    const page = vi.spyOn(services.notifications, 'page');
    const mark = vi.spyOn(services.notifications, 'markAllRead').mockRejectedValueOnce(new Error('unavailable')).mockResolvedValue(undefined);
    function Counter() { const value = useTeamPlatformData(); return <output aria-label="Unread count">{value.notifications.filter(item => !item.read).length}</output>; }
    mount(<><Counter /><NotificationCenterPage /></>);
    const button = await screen.findByRole('button', { name: 'Hamısını oxunmuş et' });
    fireEvent.click(button);
    await screen.findByText('Bildirişlər yenilənmədi. Yenidən cəhd edin.');
    expect(screen.getByLabelText('Unread count')).toHaveTextContent('1');
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByLabelText('Unread count')).toHaveTextContent('0'));
    expect(mark).toHaveBeenCalledTimes(2);
    expect(read).toHaveBeenCalledTimes(1);
    expect(page).not.toHaveBeenCalled();
  });
  it('allows reviewing archive requirements but gates unavailable destructive writes', async () => {
    vi.spyOn(services.auth, 'getSession').mockResolvedValue({ user: currentTeam.captain, role: 'captain' });
    const archive = vi.spyOn(services.teams, 'archive');
    mount(<TeamGovernancePage />);
    const button = await screen.findByRole('button', { name: 'Arxiv qaydalarını yoxla' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dəyişikliyi təsdiqlə' })).toBeDisabled();
    expect(archive).not.toHaveBeenCalled();
  });
});
