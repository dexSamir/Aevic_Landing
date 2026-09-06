// Test-only Vite entry. Deliberately no App, route loader, index.css or public-pages.css.
import '../../src/styles/tokens.css';
import '../../src/styles/globals.css';
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { CalendarDays, ShieldCheck } from 'lucide-react';
import { TournamentCalendar } from '../../src/components/competition/TournamentCalendar';
import { Tabs, EmptyState } from '../../src/components/common/primitives';
import { FileUpload } from '../../src/components/common/FileUpload';
import { PublicHeader } from '../../src/layouts/layouts';
import { SidebarNav } from '../../src/layouts/WorkspaceNav';
import { tournaments } from '../../src/mocks/data';

function Gallery() {
  const [active,setActive]=useState('overview');
  return <MemoryRouter initialEntries={['/team']}><PublicHeader /><main style={{padding:'140px 16px 24px',maxWidth:1000,margin:'auto'}}><h1>UI yoxlaması</h1>
    <TournamentCalendar tournaments={tournaments} />
    <Tabs items={[{id:'overview',label:'İcmal'},{id:'schedule',label:'Yarış təqvimi'},{id:'results',label:'Nəticələr'}]} active={active} onChange={setActive} />
    <FileUpload label="Komanda loqosu" onFile={()=>{}} />
    <EmptyState title="Dərc edilmiş nəticə yoxdur" body="Təsdiqlənmiş nəticələr burada görünəcək." />
    <SidebarNav label="Komanda naviqasiyası" links={[{to:'/team',label:'İcmal',icon:CalendarDays},{to:'/team/tournaments',label:'Turnirlər',icon:ShieldCheck}]} />
    <SidebarNav label="Admin naviqasiyası" links={[{to:'/admin',label:'Admin icmalı',icon:ShieldCheck}]} />
  </main></MemoryRouter>;
}
createRoot(document.getElementById('root')!).render(<Gallery />);
