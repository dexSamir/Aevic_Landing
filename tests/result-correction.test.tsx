import {beforeEach, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import {AdminResultCorrectionPage} from '../src/pages/routes/AdminResultCorrectionPage';
const api=vi.hoisted(()=>({current:vi.fn(),versions:vi.fn(),correct:vi.fn()}));
vi.mock('../src/services',()=>({services:{results:api}}));
vi.mock('../src/utils/readResultScreenshot', () => ({ readResultScreenshot: async () => 'Team Rank: 3\nTotal Eliminations: 8' }));
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

it('applies verified screenshot fields locally before the reasoned correction is submitted', async () => {
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL() { return 'blob:result-review'; }
    static revokeObjectURL() {}
  });
  try {
    api.correct.mockResolvedValueOnce({ ...result, placement: 3, finishes: 9, version: 2 });
    view();
    const input = await screen.findByLabelText(/Nəticə şəkli/);
    fireEvent.change(input, { target: { files: [new File(['fixture'], 'team.png', { type: 'image/png' })] } });
    await screen.findByText('Komandanı və oxunan dəyərləri şəkillə yoxlayın.');
    expect(screen.getByLabelText('Kill')).toHaveValue(4);
    fireEvent.change(screen.getByLabelText('Qaralama komanda kill sayı'), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: /Şəkillə yoxladım/ }));
    expect(screen.getByLabelText('Kill')).toHaveValue(9);
    expect(api.correct).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Düzəliş səbəbi'), { target: { value: 'Verified team placement and eliminations' } });
    fireEvent.click(screen.getByRole('button', { name: 'Yeni versiyanı saxla' }));
    await screen.findByText('Cari versiya: 2');
    expect(api.correct).toHaveBeenCalledWith('result', expect.objectContaining({ placement: 3, finishes: 9, penalties: 0 }),
      'Verified team placement and eliminations', 1, expect.any(String));
  } finally {
    vi.unstubAllGlobals();
  }
});
