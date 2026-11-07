import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { it, expect, vi } from 'vitest';
import { AdminPlayerDetailPage } from '../src/pages/routes/AdminPlayerDetailPage';
import { services } from '../src/services';
import { ApiError } from '../src/services/apiError';
function show(){return render(<MemoryRouter initialEntries={['/admin/players/10:player1']}><Routes><Route path="/admin/players/:playerId" element={<AdminPlayerDetailPage/>}/></Routes></MemoryRouter>);}
it('passes the complete composite route identifier and renders a real detail response',async()=>{
 const load=vi.spyOn(services.operations,'player').mockResolvedValue({id:'10:player1',slug:'10:player1',ign:'Player One',achievements:[],tournamentHistory:[],membershipHistory:[],eligibilityConflicts:[],sanctions:[],verification:{id:'10:player1',entityId:'10:player1',entityType:'PLAYER',entityName:'Player One',representativeName:'',officialSocials:{},evidenceNames:[],status:'NOT_APPLIED'}});
 show();expect(await screen.findByRole('heading',{name:'Player One'})).toBeInTheDocument();expect(load).toHaveBeenCalledWith('10:player1');
});
it.each([[403,'Giriş icazəsi yoxdur'],[401,'Sessiya etibarlı deyil'],[503,'Məlumat yüklənmədi']] as const)('distinguishes status %s from not-found',async(status,title)=>{
 vi.spyOn(services.operations,'player').mockRejectedValue(new ApiError({status,kind:status===403?'forbidden':status===401?'unauthorized':'server'}));show();
 expect(await screen.findByRole('heading',{name:title})).toBeInTheDocument();expect(screen.queryByText('Oyunçu tapılmadı')).not.toBeInTheDocument();
});
it('renders absent records as not-found',async()=>{
 vi.spyOn(services.operations,'player').mockResolvedValue(undefined);show();await waitFor(()=>expect(screen.getByRole('heading',{name:'Oyunçu tapılmadı'})).toBeInTheDocument());
});
