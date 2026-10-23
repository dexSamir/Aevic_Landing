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

it('keeps drawer focus stable across updates and restores the trigger on Escape', async () => {
 const { Drawer } = await import('../src/components/common/primitives');
 function Example() {
  const [open, setOpen] = useState(false), [count, setCount] = useState(0);
  return <><button onClick={() => setOpen(true)}>Open navigation</button><Drawer open={open} title="Navigation" onClose={() => setOpen(false)}><button onClick={() => setCount(count + 1)}>Update {count}</button></Drawer></>;
 }
 const view = render(<Example />), trigger = screen.getByText('Open navigation');
 trigger.focus(); fireEvent.click(trigger);
 const dialog = await screen.findByRole('dialog', { name: 'Navigation' });
 expect(view.container.contains(dialog)).toBe(false);
 await waitFor(() => expect(dialog).toHaveFocus());
 const update = screen.getByText('Update 0'); update.focus(); fireEvent.click(update);
 await screen.findByText('Update 1'); expect(update).toHaveFocus();
 expect(document.body.style.position).toBe('fixed');
 fireEvent.keyDown(document, { key: 'Escape' });
 await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Navigation' })).toBeNull());
 expect(trigger).toHaveFocus(); expect(document.body.style.position).not.toBe('fixed');
});

it('handles Escape immediately after opening without waiting for a paint', async () => {
 const { Drawer } = await import('../src/components/common/primitives');
 function Example() { const [open,setOpen]=useState(false); return <><button onClick={()=>setOpen(true)}>Open immediately</button><Drawer open={open} title="Immediate navigation" onClose={()=>setOpen(false)}>Links</Drawer></>; }
 render(<Example />);
 const trigger=screen.getByText('Open immediately');trigger.focus();fireEvent.click(trigger);
 fireEvent.keyDown(document,{key:'Escape'});
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
 await waitFor(()=>expect(trigger).toHaveFocus());
 expect(document.body.style.position).not.toBe('fixed');
});
