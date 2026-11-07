import type { Tournament } from '../types/domain';
export const adminTournamentStatuses:Record<string,string>={draft:'Qaralama',published:'Dərc edilib','registration-open':'Qeydiyyat açıqdır','registration-closed':'Qeydiyyat bağlıdır',ongoing:'Canlı',completed:'Tamamlanıb',cancelled:'Ləğv edilib'};
export function tournamentStatusTone(status:Tournament['status']) {
  return status==='registration-open'?'open':status==='ongoing'?'live':status==='completed'?'completed':status==='cancelled'?'rejected':status==='published'?'approved':'draft';
}
