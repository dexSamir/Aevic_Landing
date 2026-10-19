import { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Modal } from '../src/components/common/primitives';
it('portals outside page ancestors and keeps focus stable during control changes',async()=>{
 function Example(){const [open,setOpen]=useState(false),[count,setCount]=useState(0);return <div style={{transform:'translateY(10px)'}}><button onClick={()=>setOpen(true)}>Open</button><Modal open={open} onClose={()=>setOpen(false)} title="Example"><button onClick={()=>setCount(count+1)}>Count {count}</button></Modal></div>;}
 const view=render(<Example/>),trigger=screen.getByText('Open');trigger.focus();fireEvent.click(trigger);
 const dialog=await screen.findByRole('dialog');expect(dialog.parentElement?.parentElement).toBe(document.body);expect(view.container.contains(dialog)).toBe(false);
 await waitFor(()=>expect(dialog).toHaveFocus());
 const count=screen.getByText('Count 0');count.focus();fireEvent.click(count);await screen.findByText('Count 1');expect(count).toHaveFocus();
 expect(document.body.style.position).toBe('fixed');fireEvent.keyDown(document,{key:'Escape'});
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());expect(trigger).toHaveFocus();expect(document.body.style.position).not.toBe('fixed');
});
