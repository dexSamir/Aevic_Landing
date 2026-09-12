import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { TeamsDirectoryPage } from '../src/pages/ProfilePages';
vi.mock('../src/services/PlatformDataContext', () => ({ usePublicPlatformData: () => ({ teams: [
  { id: 'a', slug: 'caspian-wolves', name: 'Caspian Wolves', rosterSize: 5, verificationLevel: 'verified' },
  { id: 'b', slug: 'baku-sentinels', name: 'Baku Sentinels', rosterSize: 4, verificationLevel: 'approved' },
  { id: 'c', slug: 'atlas-five', name: 'Atlas Five', rosterSize: 5, verificationLevel: 'verified' },
] }) }));
function Location() { const location = useLocation(); return <div data-testid="location">{location.pathname}{location.search}</div>; }
function setup() { const user = userEvent.setup(); render(<MemoryRouter initialEntries={['/teams']}><TeamsDirectoryPage /><Location /></MemoryRouter>); return user; }
const card = (name: string) => screen.getByRole('button', { name: `${name} komandasını seç` });
describe('Public Teams deliberate comparison', () => {
  it('starts without checkboxes or Region and opens a profile from the card', async () => {
    const user = setup(); expect(screen.queryByRole('checkbox')).not.toBeInTheDocument(); expect(screen.queryByLabelText('Region')).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Caspian Wolves public profilini aç' })); expect(screen.getByTestId('location')).toHaveTextContent('/teams/caspian-wolves');
  });
  it('selects the card body, deselects it and supports checkboxes and keyboard', async () => {
    const user = setup(); await user.click(screen.getByRole('button', { name: 'Müqayisə et', exact: true })); expect(screen.getAllByRole('checkbox')).toHaveLength(3); expect(screen.getByRole('status')).toHaveTextContent('0 / 2');
    await user.click(card('Caspian Wolves')); expect(screen.getByRole('status')).toHaveTextContent('1 / 2');
    await user.click(card('Caspian Wolves')); expect(screen.getByRole('status')).toHaveTextContent('0 / 2');
    await user.click(screen.getByRole('checkbox', { name: 'Caspian Wolves müqayisə üçün seç' }));
    card('Baku Sentinels').focus(); await user.keyboard(' '); expect(screen.getByRole('status')).toHaveTextContent('2 / 2');
    await user.click(card('Atlas Five')); expect(screen.getByRole('status')).toHaveTextContent('Əvvəlcə'); expect(screen.getByRole('checkbox', { name: 'Atlas Five müqayisə üçün seç' })).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Komandaları müqayisə et' })); expect(screen.getByTestId('location')).toHaveTextContent('/teams/compare?team=caspian-wolves&opponent=baku-sentinels');
  });
  it('retains hidden selections through filtering and clears them on cancel', async () => {
    const user = setup(); await user.click(screen.getByRole('button', { name: 'Müqayisə et', exact: true })); await user.click(card('Caspian Wolves'));
    await user.type(screen.getByRole('textbox', { name: 'Komanda adı ilə axtar' }), 'Baku'); await user.click(card('Baku Sentinels')); expect(screen.getByRole('status')).toHaveTextContent('2 / 2');
    await user.clear(screen.getByRole('textbox', { name: 'Komanda adı ilə axtar' })); await user.click(card('Caspian Wolves')); expect(screen.getByRole('status')).toHaveTextContent('1 / 2'); expect(screen.queryByRole('button', { name: 'Komandaları müqayisə et' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ləğv et' })); expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Müqayisə et', exact: true })); expect(screen.getByRole('status')).toHaveTextContent('0 / 2');
  });
  it('keeps explicit profile links independent and handles non-interactive card space', async () => {
    const user = setup(); await user.click(screen.getByRole('button', { name: 'Müqayisə et', exact: true }));
    const container = card('Caspian Wolves').closest('[role="listitem"]')!;
    fireEvent.click(container); expect(screen.getByRole('status')).toHaveTextContent('1 / 2');
    await user.click(within(container as HTMLElement).getByRole('link', { name: /Public profil/ })); expect(screen.getByRole('status')).toHaveTextContent('1 / 2'); expect(screen.getByTestId('location')).toHaveTextContent('/teams/caspian-wolves');
  });
  it('filters by real verification status and sorts by name', async () => {
    const user = setup(); await user.selectOptions(screen.getByLabelText('Status'), 'approved'); expect(screen.getAllByRole('listitem')).toHaveLength(1);
    await user.selectOptions(screen.getByLabelText('Status'), 'all'); await user.selectOptions(screen.getByLabelText('Sırala'), 'name'); expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Atlas Five');
  });
});

it('keeps the follow action independent of card navigation and comparison', async () => {
  const user = setup();
  const follow = screen.getAllByRole('button', { name: /Komandanı izl/ })[0];
  await user.click(follow); expect(screen.getByTestId('location')).toHaveTextContent('/teams');
  await user.click(screen.getByRole('button', { name: 'Müqayisə et', exact: true }));
  await user.click(follow); expect(screen.getByRole('status')).toHaveTextContent('0 / 2');
});
