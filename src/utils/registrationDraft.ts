import type { TeamRegistrationDraft } from '../types/domain';

export const REGISTER_DRAFT_KEY = 'aevic-register-draft-v2';
export const REGISTER_DRAFT_TTL = 24 * 60 * 60 * 1000;
export interface StoredRegistrationDraft { version: 2; updatedAt: number; step: number; draft: TeamRegistrationDraft }

export function registrationDraftPayload(draft: TeamRegistrationDraft, step: number, now = Date.now()): StoredRegistrationDraft {
  // Explicit projection: even an injected draft cannot persist password fields.
  return { version: 2, updatedAt: now, step: Math.min(4, Math.max(1, step)), draft: {
    teamName: draft.teamName, tag: draft.tag, firstName: draft.firstName, lastName: draft.lastName,
    phone: draft.phone, email: draft.email, players: draft.players.map(({ ign, uid, role }) => ({ ign, uid, role })),
  } };
}

export function parseRegistrationDraft(value: string | null, now = Date.now()): StoredRegistrationDraft | undefined {
  try {
    const parsed = JSON.parse(value ?? 'null');
    if (!parsed || parsed.version !== 2 || !Number.isFinite(parsed.updatedAt) || parsed.updatedAt > now || now - parsed.updatedAt > REGISTER_DRAFT_TTL) return undefined;
    const draft = parsed.draft;
    if (!draft || !['teamName', 'tag', 'firstName', 'lastName', 'phone', 'email'].every((key) => typeof draft[key] === 'string' && draft[key].length <= 500)) return undefined;
    if (!Array.isArray(draft.players) || draft.players.length !== 5 || !draft.players.every((p: { ign?: unknown; uid?: unknown; role?: unknown }) => p && typeof p.ign === 'string' && typeof p.uid === 'string' && ['captain', 'starter', 'substitute'].includes(String(p.role)))) return undefined;
    if (!Number.isInteger(parsed.step) || parsed.step < 1 || parsed.step > 4) return undefined;
    return registrationDraftPayload(draft, parsed.step, parsed.updatedAt);
  } catch { return undefined; }
}
