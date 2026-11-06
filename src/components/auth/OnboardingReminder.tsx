import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserRoundPlus } from 'lucide-react';
import { usePublicSession } from '../../services/PublicSessionContext';
import '../../styles/onboarding.css';
export function OnboardingReminder() {
 const {session}=usePublicSession(),{pathname}=useLocation(),[completed,setCompleted]=useState<string>();
 useEffect(()=>{const done=()=>setCompleted(session?.user.id);window.addEventListener('aevic:onboarding-complete',done);return()=>window.removeEventListener('aevic:onboarding-complete',done);},[session?.user.id]);
 const state=session?.user.onboarding;
 if(!session||completed===session.user.id||session.role==='admin'||session.user.teamId||state?.purpose!=='team'||state.status!=='team'||pathname==='/team/setup'||pathname.startsWith('/admin'))return null;
 return <Link className="onboarding-reminder" to="/team/setup" aria-label="Komanda quruluşunu tamamla"><UserRoundPlus size={21}/><span><strong>Komandanı tamamla</strong><small>Quruluşuna qaldığın yerdən davam et</small></span></Link>;
}
