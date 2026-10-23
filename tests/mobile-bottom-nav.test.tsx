import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MobileBottomNav } from '../src/layouts/MobileBottomNav';
import type { Team } from '../src/types/domain';
const session = { role:'captain' as const, user:{id:'user',firstName:'Captain',lastName:'',email:'captain@example.test',role:'captain' as const} };
const show = (props: Partial<Parameters<typeof MobileBottomNav>[0]> = {}, path='/') => render(<MemoryRouter initialEntries={[path]}><MobileBottomNav session={session} {...props} /></MemoryRouter>);
const open = () => fireEvent.click(screen.getByRole('button',{name:/hesab menyusu/}));
describe('mobile account navigation',()=>{
 it('shows login and registration for guests',()=>{show({session:null});open();expect(screen.getByRole('link',{name:'Daxil ol'})).toHaveAttribute('href','/login');expect(screen.getByRole('link',{name:'Komanda yarat'})).toHaveAttribute('href','/register');expect(screen.queryByText('Çıxış')).toBeNull();});
 it('does not invent team management permissions for an account without a team',()=>{show();open();expect(screen.getByRole('link',{name:'Hesabım'})).toBeInTheDocument();expect(screen.getByRole('link',{name:'Komanda yarat'})).toBeInTheDocument();expect(screen.queryByText('Komanda paneli')).toBeNull();});
 it('uses the actual team logo and falls back after an image error',()=>{const {container}=show({team:{name:'Active Team',logoUrl:'/missing-logo.png'} as Team});const img=container.querySelector('.team-logo img')!;expect(img).toHaveAttribute('src','/missing-logo.png');fireEvent.error(img);expect(container.querySelector('.team-logo img')).toBeNull();expect(container.querySelector('.team-logo')).toHaveTextContent('AT');open();expect(screen.getByRole('link',{name:'Komanda paneli'})).toHaveAttribute('href','/team');});
 it('has a fallback for absent team artwork',()=>{const {container}=show({team:{name:'Active Team'} as Team});expect(container.querySelector('.team-logo')).toHaveTextContent('AT');});
 it('keeps administrator-only destinations out of the ordinary menu',()=>{show({session:{...session,role:'admin',user:{...session.user,role:'admin'}}});open();expect(document.querySelector('a[href^="/admin"]')).toBeNull();expect(screen.queryByText('Komanda yarat')).toBeNull();});
 it('can retry an unavailable session',()=>{const refresh=vi.fn();show({session:undefined,refresh});open();fireEvent.click(screen.getByText('Sessiyanı yenidən yoxla'));expect(refresh).toHaveBeenCalledOnce();});
 for(const [path,active] of [['/','/'],['/tournaments/cup','/tournaments'],['/teams/team','/teams'],['/matches/match','/matches'],['/team/roster',''],['/account/security','']])it(`selects one route family for ${path}`,()=>{const {container}=show({},path);const selected=container.querySelectorAll('[aria-current]');expect(selected).toHaveLength(active?1:0);if(active)expect(selected[0]).toHaveAttribute('href',active);else expect(container.querySelector('.is-active')).toBeInTheDocument();});
});

it('keeps only essential workspace links and restores focus on Escape',()=>{
 show({team:{name:'Active Team'} as Team});open();
 const panel=screen.getByRole('navigation',{name:'Hesab əməliyyatları'});
 expect([...panel.querySelectorAll('a')].map(a=>a.getAttribute('href'))).toEqual(['/account/profile','/team','/team/roster']);
 fireEvent.keyDown(document,{key:'Escape'});
 expect(screen.queryByRole('navigation',{name:'Hesab əməliyyatları'})).toBeNull();
 expect(screen.getByRole('button',{name:/hesab menyusu/})).toHaveFocus();
});
