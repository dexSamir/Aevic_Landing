import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {ShareProfileAction} from '../src/components/profile/PublicTeamExperience';
import {TeamAnalytics} from '../src/components/team/TeamAnalytics';
import type {MatchHistoryEntry} from '../src/types/domain';
it('announces copying only after clipboard success and never invokes native sharing',async()=>{
 let finish!:()=>void;const writeText=vi.fn(()=>new Promise<void>(r=>{finish=r;})),share=vi.fn();
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText}});Object.defineProperty(navigator,'share',{configurable:true,value:share});
 render(<ShareProfileAction teamName="Team"/>);fireEvent.click(screen.getByRole('button',{name:/linki kopyala/}));
 expect(screen.queryByText('Link kopyalandı')).toBeNull();expect(share).not.toHaveBeenCalled();finish();expect(await screen.findByText('Link kopyalandı')).toBeInTheDocument();
 expect(writeText).toHaveBeenCalledWith(window.location.href);
});
it('reports clipboard refusal without success',async()=>{
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:vi.fn().mockRejectedValue(new Error('denied'))}});
 render(<ShareProfileAction teamName="Team"/>);fireEvent.click(screen.getByRole('button',{name:/linki kopyala/}));
 await waitFor(()=>expect(screen.getByText('Link kopyalanmadı')).toBeInTheDocument());expect(screen.queryByText('Link kopyalandı')).toBeNull();
});
it('keeps separate rounds readable at the same timestamp',()=>{
 const history:MatchHistoryEntry[]=Array.from({length:4},(_,i)=>({id:String(i),playedAt:'2025-08-23T10:00:00Z',map:'Erangel',placement:i+1,finishes:i,points:i+4,tournamentId:'cup',tournamentName:'Cup',stage:'final',stageLabel:'Final',wwcd:i===0}));
 render(<TeamAnalytics history={history}/>);
 const chart=screen.getByRole('group',{name:/Matçlar üzrə kill sayı. X:/});
 const positions=[...chart.querySelectorAll('.chart-point')].map(node=>node.getAttribute('cx'));
 expect(new Set(positions).size).toBe(4);
});
it('native sharing never reports that the clipboard was copied',async()=>{
 const share=vi.fn().mockResolvedValue(undefined),writeText=vi.fn();
 Object.defineProperty(navigator,'share',{configurable:true,value:share});Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText}});
 render(<ShareProfileAction teamName="Team"/>);fireEvent.click(screen.getByRole('button',{name:'Paylaş'}));
 await waitFor(()=>expect(share).toHaveBeenCalled());expect(writeText).not.toHaveBeenCalled();expect(screen.queryByText('Link kopyalandı')).toBeNull();
});
