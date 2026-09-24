import type { ResultDispute,RosterChangeRequest } from '../../types/domain';

export function requestStatus(status: RosterChangeRequest['status']) {
  return status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : status === 'under-review' ? 'warning' : 'pending';
}
export function disputeStatus(status: ResultDispute['status']) { return status === 'resolved' ? 'approved' : status === 'rejected' ? 'rejected' : 'warning'; }
