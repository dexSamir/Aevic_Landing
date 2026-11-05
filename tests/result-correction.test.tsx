import {beforeEach, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import {AdminResultCorrectionPage} from '../src/pages/routes/AdminResultCorrectionPage';
const api=vi.hoisted(()=>({current:vi.fn(),versions:vi.fn(),correct:vi.fn()}));
vi.mock('../src/services',()=>({services:{results:api}}));
const result={id:'result',tournamentId:'cup',roundId:'round',teamId:'1',placement:1,finishes:4,penalties:0,placementPoints:10,finishPoints:4,totalPoints:14,published:true,version:1};
beforeEach(()=>{vi.clearAllMocks();api.current.mockResolvedValue(result);api.versions.mockResolvedValue([]);});
function view(){render(<MemoryRouter initialEntries={['/admin/results/result/correction']}><Routes><Route path="/admin/results/:resultId/correction" element={<AdminResultCorrectionPage/>}/></Routes></MemoryRouter>);}
it('edits the published baseline without prior history and uses the acknowledged version for the next correction',async()=>{
 api.correct.mockResolvedValueOnce({...result,finishes:5,version:2}).mockResolvedValueOnce({...result,finishes:6,version:3});
 view();await screen.findByText('Cari versiya: 1');expect(screen.getByLabelText('Kill')).toHaveValue(4);
 fireEvent.change(screen.getByLabelText('Kill'),{target:{value:'5'}});fireEvent.change(screen.getByLabelText('Düzəliş səbəbi'),{target:{value:'Verified first correction'}});
 fireEvent.click(screen.getByRole('button',{name:'Yeni versiyanı saxla'}));await screen.findByText('Cari versiya: 2');
 expect(api.correct.mock.calls[0][1]).not.toHaveProperty('version');expect(api.correct.mock.calls[0][3]).toBe(1);
 expect(screen.queryByText('Versiya 2')).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Kill'),{target:{value:'6'}});fireEvent.change(screen.getByLabelText('Düzəliş səbəbi'),{target:{value:'Verified second correction'}});
 fireEvent.click(screen.getByRole('button',{name:'Yeni versiyanı saxla'}));await screen.findByText('Cari versiya: 3');expect(api.correct.mock.calls[1][3]).toBe(2);
});
it('reuses the idempotency key after an uncertain response',async()=>{
 api.correct.mockRejectedValueOnce(new Error('Lost response')).mockResolvedValueOnce({...result,version:2});view();await screen.findByText('Cari versiya: 1');
 fireEvent.change(screen.getByLabelText('Düzəliş səbəbi'),{target:{value:'Verified correction reason'}});
 fireEvent.click(screen.getByRole('button',{name:'Yeni versiyanı saxla'}));await screen.findByText(/Düzəliş təsdiqlənmədi/);
 fireEvent.click(screen.getByRole('button',{name:'Yeni versiyanı saxla'}));await waitFor(()=>expect(api.correct).toHaveBeenCalledTimes(2));expect(api.correct.mock.calls[0][4]).toBe(api.correct.mock.calls[1][4]);
});
