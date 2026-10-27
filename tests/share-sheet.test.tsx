import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ShareSheet } from '../src/components/common/ShareSheet';
afterEach(()=>{vi.restoreAllMocks();});
it('generates images only on request and shares an actual file on a separate gesture',async()=>{
 const file=new File(['png-fixture'],'team.png',{type:'image/png'}),create=vi.fn().mockResolvedValue(file),share=vi.fn().mockResolvedValue(undefined);
 Object.defineProperty(navigator,'share',{configurable:true,value:share});Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
 render(<ShareSheet open onClose={()=>{}} title="Team" url="https://example.test/teams/1" createFile={create}/>);
 expect(create).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Paylaşım şəklini hazırla'}));
 fireEvent.click(await screen.findByRole('button',{name:'Şəkli tətbiqdə paylaş'}));
 await waitFor(()=>expect(share).toHaveBeenCalledWith({title:'Team',files:[file]}));
 expect(create).toHaveBeenCalledTimes(1);
 expect(screen.getByRole('link',{name:'WhatsApp'})).toHaveAttribute('href','https://wa.me/?text=Team%0Ahttps%3A%2F%2Fexample.test%2Fteams%2F1');
});
it('native cancellation is silent and never claims success',async()=>{
 Object.defineProperty(navigator,'share',{configurable:true,value:vi.fn().mockRejectedValue(new DOMException('cancelled','AbortError'))});
 render(<ShareSheet open onClose={()=>{}} title="Team" url="https://example.test/teams/1"/>);
 fireEvent.click(screen.getByRole('button',{name:'Digər tətbiqlər · link'}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Digər tətbiqlər · link'})).not.toBeDisabled());
 expect(screen.getByRole('status')).toBeEmptyDOMElement();
});
