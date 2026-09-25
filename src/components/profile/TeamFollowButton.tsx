import { BellPlus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { services } from '../../services';
import { invalidateQuery, usePlatformQuery } from '../../services/queryCache';
import { Button } from '../common/primitives';

export function TeamFollowButton({teamId}:{teamId:string}) {
 const navigate=useNavigate(),[busy,setBusy]=useState(false),[failure,setFailure]=useState('');
 const session=usePlatformQuery({key:'following:session',query:()=>services.auth.getSession(),staleTime:30000});
 const eligible=Boolean(session.data&&session.data.role!=='admin');
 const follows=usePlatformQuery({key:'following:teams',query:()=>services.follows!.list(),enabled:eligible,staleTime:30000});
 const following=Boolean(follows.data?.some(item=>item.entityId===teamId&&item.following));
 const toggle=async()=>{
  if(!session.data){navigate('/login');return;}
  if(session.data.role==='admin'){setFailure('İzləmə üçün şəxsi hesabınızla daxil olun.');return;}
  if(busy)return;setBusy(true);setFailure('');
  try{await services.follows!.mutate({entityType:'TEAM',entityId:teamId,following:!following});invalidateQuery('following:');}
  catch{setFailure('İzləmə saxlanılmadı. Yenidən cəhd edin.');}
  finally{setBusy(false);}
 };
 const failed=session.error||follows.error;
 return <div><Button size="sm" variant="secondary" aria-pressed={following} aria-label={following?'Komandanı izləməyi dayandır':'Komandanı izlə'} disabled={session.loading||eligible&&follows.loading||busy} loading={busy} icon={<BellPlus size={15}/>} onClick={()=>{if(failed){session.refetch();follows.refetch();}else void toggle();}}>{failed?'Yenidən yoxla':following?'İzlənir':'İzlə'}</Button>{failure&&<small role="alert">{failure}</small>}</div>;
}
