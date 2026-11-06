import {
Bell,
Laptop,
LockKeyhole,
UserRound, Users
} from "lucide-react";
import "../../app/workspaceStyles";
import { services } from "../../services";
import { updateCachedQuery,usePlatformQuery } from '../../services/queryCache';
import type {
AccountProfile
} from "../../types/domain";

export const accountLinks = [
  {to:"/account/onboarding",label:"Hesab məqsədi",icon:UserRound},
  {to:"/account/invitations",label:"Dəvətlər",icon:Users},
  { to: "/account/profile", label: "Profil", icon: UserRound },
  { to: "/account/security", label: "Təhlükəsizlik", icon: LockKeyhole },
  { to: "/account/notifications", label: "Bildirişlər", icon: Bell },
  { to: "/account/sessions", label: "Sessiyalar", icon: Laptop },
];
export function useAccountProfile() {
  const query=usePlatformQuery({key:'account:profile',query:()=>services.account.profile()});
  const setProfile=(profile:AccountProfile)=>updateCachedQuery<AccountProfile>('account:profile',()=>profile);
  return {profile:query.data,setProfile,failed:Boolean(query.error&&!query.data)};
}
