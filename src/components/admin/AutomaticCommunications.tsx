import { useState } from 'react';
import { Button, Checkbox, Input, Select, Textarea } from '../common/primitives';
import { services } from '../../services';
import type { CommunicationRule } from '../../services/contracts';
import { usePlatformQuery } from '../../services/queryCache';

export function AutomaticCommunications() {
  const [open, setOpen] = useState(false),
    [selected, setSelected] = useState('');
  const query = usePlatformQuery({
    key: 'admin:communication-rules',
    query: services.admin.automation,
    enabled: open,
  });
  const rule = query.data?.rules.find((r) => r.kind === selected) ?? query.data?.rules[0];
  return (
    <details className="comm-automation" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>Avtomatik AEVIC bildirişləri</summary>
      {open && (
        <div>
          <p>Sistem hadisələri bu bildirişləri AEVIC Admin adından göndərir.</p>
          {query.error && (
            <p role="alert">
              Ayarlar yüklənmədi. <button onClick={query.refetch}>Yenilə</button>
            </p>
          )}
          {query.loading && <p role="status">Yüklənir…</p>}
          {rule && (
            <>
              <Select label="Hadisə" value={rule.kind} onChange={(e) => setSelected(e.target.value)}>
                {query.data?.rules.map((r) => (
                  <option key={r.kind} value={r.kind}>
                    {r.title}
                  </option>
                ))}
              </Select>
              <RuleEditor
                key={rule.kind + rule.revision}
                rule={rule}
                canEdit={Boolean(query.data?.canEdit)}
                saved={query.refetch}
              />
            </>
          )}
          {query.data && (
            <section>
              <h3>Son çatdırılmalar</h3>
              {query.data.outcomes.length ? (
                <ul>
                  {query.data.outcomes.map((r, i) => (
                    <li key={r.reference + ':' + r.status + ':' + i}>
                      <strong>{query.data?.rules.find((rule) => rule.kind === r.kind)?.title}</strong> ·{' '}
                      {r.channel === 'email' ? 'E-poçt' : 'Tətbiqdaxili'} ·{' '}
                      {statusName[r.status] ?? r.status}
                      {' · '}
                      {r.attempts} cəhd ·{' '}
                      {new Date(r.at).toLocaleString('az-AZ', { timeZone: 'Asia/Baku' })}
                      {r.retryAt && r.status === 'retry' && (
                        <small>
                          {' '}
                          · Növbəti cəhd{' '}
                          {new Date(r.retryAt).toLocaleString('az-AZ', { timeZone: 'Asia/Baku' })}
                        </small>
                      )}
                      {['uncertain', 'failed'].includes(r.status) && (
                        <small>
                          {' '}
                          · Çatdırılma: <code>{r.reference}</code>
                        </small>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Hələ çatdırılma qeydə alınmayıb.</p>
              )}
            </section>
          )}
        </div>
      )}
    </details>
  );
}
const statusName: Record<string, string> = {
  sent: 'Göndərilib',
  pending: 'Növbədə',
  processing: 'Göndərilir',
  sending: 'Göndərilir',
  failed: 'Uğursuz',
  retry: 'Təkrar gözləyir',
  uncertain: 'Təsdiq tələb edir',
  skipped: 'Buraxılıb',
};
function RuleEditor({
  rule,
  canEdit,
  saved,
}: {
  rule: CommunicationRule;
  canEdit: boolean;
  saved: () => void;
}) {
  const [draft, setDraft] = useState(rule),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <form
      className="operation-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError('');
        try {
          const { body, enabled, inApp, email, leadMinutes, revision } = draft;
          await services.admin.updateAutomation(rule.kind, {
            body,
            enabled,
            inApp,
            email,
            leadMinutes,
            revision,
          });
          saved();
        } catch {
          setError('Ayarlar saxlanmadı. Hadisənin dəyişənlərini və vaxtını yoxlayın.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={!canEdit || busy}>
        <Checkbox
          label="Hadisə aktivdir"
          checked={draft.enabled}
          onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
        />
        <Checkbox
          label="Tətbiqdaxili"
          checked={draft.inApp}
          onChange={(e) => setDraft({ ...draft, inApp: e.target.checked })}
        />
        {['welcome', 'champion'].includes(rule.kind) && (
          <Checkbox
            label="E-poçt"
            checked={draft.email}
            onChange={(e) => setDraft({ ...draft, email: e.target.checked })}
          />
        )}
        {draft.leadMinutes !== null && (
          <Input
            label={
              rule.kind === 'welcome-back'
                ? 'Fəaliyyətsizlik müddəti (dəqiqə)'
                : 'Əvvəlcədən bildiriş (dəqiqə)'
            }
            type="number"
            required
            min={rule.kind === 'welcome-back' ? 1440 : 5}
            max={rule.kind === 'welcome-back' ? 525600 : 1440}
            value={draft.leadMinutes}
            onChange={(e) => setDraft({ ...draft, leadMinutes: Number(e.target.value) })}
          />
        )}
        <Textarea
          label="Mesaj şablonu"
          value={draft.body}
          required
          maxLength={1500}
          onChange={(e) => setDraft({ ...draft, body: e.target.value })}
        />
        {canEdit && (
          <Button type="submit" loading={busy}>
            Saxla
          </Button>
        )}
      </fieldset>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
