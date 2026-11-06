import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AccountPurposeChoice } from '../../components/auth/AccountPurposeChoice';
import { Button, PageHeader } from '../../components/common/primitives';
import { services } from '../../services';
import { usePublicSession } from '../../services/PublicSessionContext';
import { usePlatformQuery } from '../../services/queryCache';
import '../../styles/onboarding.css';
export function AccountOnboardingPage() {
 const {session,refresh}=usePublicSession(),navigate=useNavigate();
 const query=usePlatformQuery({key:`account:onboarding:${session?.user.id}`,scope:'private',query:()=>services.account.onboarding(),staleTime:0});
 const [purpose,setPurpose]=useState<'spectator'|'team'|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const choose=async()=>{if(!purpose||!query.data||busy)return;setBusy(true);setError('');try{await services.account.saveOnboarding({purpose,revision:query.data.revision});refresh();navigate(purpose==='team'?'/team/setup':'/',{replace:true});}catch(e){setError(e instanceof Error?e.message:'Seçim saxlanılmadı.');}finally{setBusy(false);}};
 if(session?.user.teamId)return <div><PageHeader title="Komandanız hazırdır"/><Link className="button button--primary" to="/team">Komanda panelini aç</Link></div>;
 return <div className="team-setup"><PageHeader eyebrow="AEVIC hesabı" title="Öz yolunu seç" description="İzləyici hesabı komanda yaratmağı tələb etmir. Seçiminizi sonra dəyişə bilərsiniz."/>{query.loading?<p role="status">Seçim yüklənir…</p>:query.error?<div role="alert"><p>Məlumatlar yüklənmədi.</p><Button onClick={query.refetch}>Yenidən yoxla</Button></div>:<div className="team-setup__surface"><AccountPurposeChoice value={purpose} onChange={setPurpose} disabled={busy}/>{error&&<p role="alert">{error}</p>}<div className="team-setup__actions"><Link to="/">Sonra davam et</Link><Button onClick={()=>void choose()} loading={busy} disabled={!purpose}>Davam et</Button></div></div>}</div>;
}
