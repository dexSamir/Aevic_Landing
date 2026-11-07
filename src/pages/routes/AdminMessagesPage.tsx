import { AdminTournamentSelect } from '../../components/admin/AdminTournamentSelect';
import '../../styles/admin-results.css';
import { useRef, useState } from 'react';
import { Check, ChevronDown, Eye, History, Megaphone, Send, Users } from 'lucide-react';
import { AdminSearch } from '../../components/admin/AdminPrimitives';
import {
  Button,
  EmptyState,
  Input,
  Modal,
  NotificationItem,
  PageHeader,
  TeamLogo,
  Textarea,
} from '../../components/common/primitives';
import { services } from '../../services';
import { useAdminPlatformData } from '../../services/PlatformDataContext';
import { usePlatformQuery } from '../../services/queryCache';
import type { AdminMessage } from '../../types/domain';
import { formatEventDate } from '../../utils/calendar';
import '../../styles/admin-communications.css';

const priorities = { info: 'Adi', warning: 'Vacib', critical: 'Təcili' } as const;
type Draft = Parameters<typeof services.admin.sendMessage>[0];

export function AdminMessagesPage() {
  const { adminMessages, tournaments } = useAdminPlatformData();
  const directory = usePlatformQuery({
    key: 'admin:message-recipients',
    query: services.admin.messageRecipients,
    refetchOnFocus: true,
  });
  const profile = usePlatformQuery({ key: 'admin:alias', query: services.admin.alias });
  const [audience, setAudience] = useState<'all' | 'team' | 'tournament'>('all');
  const [tournamentId, setTournamentId] = useState('');
  const counts = usePlatformQuery({
    key: 'admin:message-tournament-counts',
    query: services.admin.tournamentRecipientCounts,
    enabled: audience === 'tournament',
  });
  const participants = usePlatformQuery({
    key: 'admin:message-participants:' + tournamentId,
    query: () => services.admin.tournamentRecipients(tournamentId),
    enabled: audience === 'tournament' && Boolean(tournamentId),
    staleTime: 0,
  });
  const [teamId, setTeamId] = useState(''),
    [search, setSearch] = useState(''),
    [historySearch, setHistorySearch] = useState('');
  const [title, setTitle] = useState(''),
    [body, setBody] = useState(''),
    [severity, setSeverity] = useState<keyof typeof priorities>('info');
  const [actionHref, setActionHref] = useState('');
  const [review, setReview] = useState<{
    input: Draft;
    label: string;
    key: string;
    createdAt: string;
    sender: string;
  }>();
  const attempt = useRef<{ signature: string; key: string }>(undefined);
  const lock = useRef(false),
    [sending, setSending] = useState(false),
    [feedback, setFeedback] = useState(''),
    [error, setError] = useState('');
  const teams = directory.data ?? [],
    selected = teams.find((team) => team.id === teamId);
  const matches = teams
    .filter((team) =>
      (team.name + ' ' + (team.tag ?? '')).toLocaleLowerCase('az').includes(search.toLocaleLowerCase('az')),
    )
    .slice(0, 12);
  const count =
    audience === 'tournament'
      ? (participants.data?.teams.length ?? 0)
      : audience === 'all'
        ? teams.length
        : Number(Boolean(selected));
  const audienceLabel =
    audience === 'tournament'
      ? `${participants.data?.tournamentName ?? 'Turnir seçin'} · ${count} komanda`
      : audience === 'all'
        ? `Bütün komandalar · ${count}`
        : selected
          ? `${selected.name} · #${selected.id}`
          : 'Komanda seçin';
  const canReview =
    count > 0 &&
    !(audience === 'tournament'
      ? participants.error || participants.loading || participants.refreshing
      : directory.error) &&
    Boolean(profile.data) &&
    title.trim().length >= 2 &&
    Boolean(body.trim());
  function preview() {
    if (!canReview) return;
    setError('');
    setFeedback('');
    const input = {
      audience,
      title: title.trim(),
      body: body.trim(),
      severity,
      teamId: audience === 'team' ? teamId : undefined,
      actionHref: actionHref || undefined,
      expectedCount: count,
      tournamentId: audience === 'tournament' ? tournamentId : undefined,
      recipientVersion: audience === 'tournament' ? participants.data?.recipientVersion : undefined,
    };
    const signature = JSON.stringify(input);
    if (attempt.current?.signature !== signature) attempt.current = { signature, key: crypto.randomUUID() };
    setReview({
      input,
      label: audienceLabel,
      key: attempt.current.key,
      createdAt: new Date().toISOString(),
      sender: profile.data!.displayName,
    });
  }
  async function send() {
    if (!review || lock.current) return;
    lock.current = true;
    setSending(true);
    setError('');
    try {
      const sent = await services.admin.sendMessage(review.input, review.key);
      attempt.current = undefined;
      setFeedback(`Elan ${sent.recipientCount} komandanın mesaj qutusuna göndərildi.`);
      setReview(undefined);
      setTitle('');
      setBody('');
      setTeamId('');
      setTournamentId('');
      setSearch('');
      setActionHref('');
    } catch (e) {
      if ((e as { code?: string }).code === 'RECIPIENTS_CHANGED') {
        setReview(undefined);
        directory.refetch();
        participants.refetch();
        counts.refetch();
        setError('Alıcı siyahısı dəyişib. Yenilənmiş auditoriyanı yoxlayın.');
      } else setError(e instanceof Error ? e.message : 'Elan göndərilmədi.');
    } finally {
      lock.current = false;
      setSending(false);
    }
  }
  const history = adminMessages.filter((m) =>
    (m.title + ' ' + (m.senderAlias ?? '') + ' ' + (m.recipientName ?? ''))
      .toLocaleLowerCase('az')
      .includes(historySearch.toLocaleLowerCase('az')),
  );
  return (
    <div className="communications">
      <PageHeader
        eyebrow="Komanda əlaqələri"
        title="Mesaj mərkəzi"
        description="Rəsmi elanları hazırlayın və komandalara çatdırın."
      />
      {feedback && (
        <p role="status" className="comm-feedback">
          {feedback}
        </p>
      )}
      {error && !review && <p role="alert">{error}</p>}
      <div className="comm-workspace">
        <form
          className="comm-panel comm-compose"
          onSubmit={(e) => {
            e.preventDefault();
            preview();
          }}
        >
          <header className="comm-heading">
            <Megaphone />
            <h2>Yeni elan</h2>
          </header>
          <fieldset>
            <legend>Auditoriya</legend>
            <div className="comm-options">
              {(['all', 'team', 'tournament'] as const).map((value) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={audience === value}
                  onClick={() => setAudience(value)}
                >
                  {value === 'all' ? <Users size={16} /> : <Send size={16} />}{' '}
                  {value === 'all'
                    ? 'Bütün komandalar'
                    : value === 'team'
                      ? 'Konkret komanda'
                      : 'Turnir komandaları'}
                </button>
              ))}
            </div>
            {audience === 'tournament' ? (
              <div className="comm-tournament-recipients">
                <AdminTournamentSelect
                  tournaments={tournaments.filter((t) => !counts.data || t.id in counts.data)}
                  value={tournamentId}
                  onChange={setTournamentId}
                  disabled={false}
                  recipientCounts={counts.data}
                />
                {tournamentId &&
                  (participants.loading ? (
                    <p role="status">İştirakçılar yüklənir…</p>
                  ) : participants.error ? (
                    <p role="alert">
                      İştirakçılar yüklənmədi.{' '}
                      <Button variant="ghost" onClick={participants.refetch}>
                        Yenilə
                      </Button>
                    </p>
                  ) : (
                    participants.data && (
                      <>
                        <p className="comm-muted">{count} alıcı komanda · Təsdiqlənmiş iştirakçılar</p>
                        {!count ? (
                          <p>Bu turnirdə elan göndəriləcək uyğun iştirakçı yoxdur.</p>
                        ) : (
                          <details>
                            <summary>Alıcı siyahısına bax ({count})</summary>
                            <div className="comm-matches">
                              {participants.data.teams.map((team) => (
                                <div className="comm-recipient" key={team.id}>
                                  <TeamLogo name={team.name} src={team.logoUrl ?? undefined} size="sm" />
                                  <span>
                                    {team.name} · {team.tag ?? '#' + team.id}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                        <div className="comm-recipient-preview" aria-label="Alıcı komandalar">
                          {participants.data.teams.slice(0, 5).map((team) => (
                            <TeamLogo key={team.id} name={team.name} src={team.logoUrl ?? undefined} size="sm" />
                          ))}
                        </div>
                      </>
                    )
                  ))}
              </div>
            ) : directory.error ? (
              <p role="alert">
                Alıcılar yüklənmədi.{' '}
                <button type="button" onClick={directory.refetch}>
                  Yenilə
                </button>
              </p>
            ) : directory.loading ? (
              <p role="status">Alıcılar yüklənir…</p>
            ) : audience === 'all' ? (
              <p className="comm-muted">
                <strong>{count} komanda</strong> · Üzvü olan, təsdiqlənmiş və ya təsdiq gözləyən aktiv komandalar.
              </p>
            ) : selected ? (
              <div className="comm-recipient">
                <TeamLogo name={selected.name} src={selected.logoUrl ?? undefined} />
                <div>
                  <strong>{selected.name}</strong>
                  <small>
                    {selected.tag} · #{selected.id}
                  </small>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setTeamId('')}>
                  Dəyiş
                </Button>
              </div>
            ) : (
              <>
                <AdminSearch
                  label="Alıcı komanda axtar"
                  placeholder="Komanda adı və ya teq"
                  value={search}
                  onChange={setSearch}
                />
                <div className="comm-matches">
                  {matches.map((team) => (
                    <button type="button" key={team.id} onClick={() => setTeamId(team.id)}>
                      <TeamLogo name={team.name} src={team.logoUrl ?? undefined} size="sm" />
                      <span>
                        {team.name}
                        <small>
                          {team.tag} · #{team.id}
                        </small>
                      </span>
                    </button>
                  ))}
                  {!matches.length && <p>Komanda tapılmadı.</p>}
                </div>
              </>
            )}
          </fieldset>
          <Input
            label="Elan başlığı"
            value={title}
            maxLength={160}
            required
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            label="Elan mətni"
            rows={5}
            value={body}
            maxLength={4000}
            required
            onChange={(e) => setBody(e.target.value)}
          />
          <fieldset>
            <legend>Prioritet</legend>
            <div className="comm-options">
              {(Object.keys(priorities) as Array<keyof typeof priorities>).map((key) => (
                <button type="button" key={key} aria-pressed={key === severity} onClick={() => setSeverity(key)}>
                  {key === severity && <Check size={14} />} {priorities[key]}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="field">
            <span>Daxili keçid</span>
            <select value={actionHref} onChange={(e) => setActionHref(e.target.value)}>
              <option value="">{audience==='tournament'?'Turnirin səhifəsi':'Keçidsiz'}</option>
              <option value="/tournaments">Turnirlər</option>
              <option value="/regulations">Qaydalar</option>
              <option value="/team">Komanda paneli</option>
            </select>
          </label>
          <footer className="comm-actions">
            <span>{audienceLabel}</span>
            <Button type="submit" disabled={!canReview} icon={<Eye size={17} />}>
              Önbaxış
            </Button>
          </footer>
        </form>
        <section className="comm-panel comm-history">
          <header className="comm-heading">
            <History />
            <h2>Göndərilmiş elanlar</h2>
          </header>
          <AdminSearch
            label="Elan axtar"
            placeholder="Başlıq, komanda və ya admin"
            value={historySearch}
            onChange={setHistorySearch}
          />
          {history.length ? (
            history.map((message) => <HistoryItem key={message.id} message={message} />)
          ) : (
            <EmptyState title="Elan tapılmadı" body="Göndərilmiş elanlar burada görünəcək." />
          )}
        </section>
      </div>
      <Modal
        open={Boolean(review)}
        title="Elanı təsdiqlə"
        onClose={() => {
          if (!sending) setReview(undefined);
        }}
        footer={
          <>
            <Button variant="ghost" disabled={sending} onClick={() => setReview(undefined)}>
              Redaktə et
            </Button>
            <Button loading={sending} onClick={send} icon={<Send size={16} />}>
              Elanı göndər
            </Button>
          </>
        }
      >
        {review && (
          <>
            <p className="comm-review-scope">
              <Users size={17} /> {review.label}
            </p>
            <NotificationItem
              item={{
                ...review.input,
                id: 'preview',
                senderAlias: review.sender,
                createdAt: review.createdAt,
                tournamentName: review.input.tournamentId ? review.label : undefined,
                actionHref:
                  review.input.actionHref ??
                  (review.input.tournamentId ? '/tournaments/' + review.input.tournamentId : undefined),
                eventType: 'admin-message',
                read: false,
              }}
            />
            {review.input.actionHref && <small>{review.input.actionHref}</small>}
            {error && <p role="alert">{error}</p>}
          </>
        )}
      </Modal>
    </div>
  );
}
function HistoryItem({ message }: { message: AdminMessage }) {
  const scope =
    message.audience === 'tournament'
      ? (message.tournamentName ?? 'Turnir komandaları')
      : message.audience === 'team'
        ? (message.recipientName ?? (message.teamId ? '#' + message.teamId : 'Komanda'))
        : 'Bütün komandalar';
  return (
    <details className="comm-history-item">
      <summary>
        <span>
          <small>{formatEventDate(message.createdAt, { withTime: true })}</small>
          <strong>{message.title}</strong>
          <small>
            {message.senderAlias ?? 'AEVIC Admin'} · {scope}
            {message.recipientCount != null ? ` · ${message.recipientCount} komanda` : ''}
          </small>
        </span>
        <ChevronDown size={16} />
      </summary>
      <p>{message.body}</p>
      {message.actionHref && <small>{message.actionHref}</small>}
      {message.deliveryCount != null && <small>{message.deliveryCount} tətbiqdaxili bildiriş yaradılıb</small>}
    </details>
  );
}
