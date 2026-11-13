import { normalizeNotificationPreferences, notificationEventLabels } from '../../utils/notificationPreferences';
import { NotificationInbox } from './NotificationCenterPage';
import { useProtectedSession } from '../../layouts/ProtectedRoute';
import { usePlatformQuery, updateCachedQuery } from '../../services/queryCache';
import type { CursorPage, Notification } from '../../types/domain';
import { useEffect,useState } from "react";
import "../../app/workspaceStyles";
import {
Button,
Checkbox,
EmptyState,
LoadingSkeleton,
SectionHeading,
Toast
} from "../../components/common/primitives";
import { services } from "../../services";
import type {
NotificationPreferences
} from "../../types/domain";

export function AccountNotificationsPage() {
  const session = useProtectedSession();
  const key = 'account:notifications:' + session?.user.id + ':' + (session?.user.teamId ?? '');
  const page = usePlatformQuery({ key, query: () => services.notifications.page() });
  return <>
    {page.data ? <NotificationInbox key={key} initialItems={page.data.items} initialCursor={page.data.nextCursor}
      onUpdate={patch => updateCachedQuery<CursorPage<Notification>>(key, value => ({ ...value, items: value.items.map(patch) }))} />
      : page.error ? <p role="alert">Bildirişlər yüklənmədi. <Button variant="ghost" onClick={page.refetch}>Yenidən cəhd et</Button></p> : <LoadingSkeleton variant="form" rows={3}/>}
    <NotificationSettings />
  </>;
}

function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferences>();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    services.notifications
      .preferences()
      .then(value => setPreferences(normalizeNotificationPreferences(value)))
      .catch(() => setError("Bildiriş seçimləri yüklənmədi."));
  }, []);
  if (error && !preferences)
    return (
      <EmptyState title={error} body="Səhifəni yeniləyib yenidən cəhd edin." />
    );
  if (!preferences) return <LoadingSkeleton variant="form" rows={6} />;
  const toggleEvent = (key: string) =>
    setPreferences({
      ...preferences,
      events: { ...preferences.events, [key]: !preferences.events[key] },
    });
  const save = async () => {
    try {
      setPreferences(
        await services.notifications.updatePreferences(preferences),
      );
      setSaved(true);
      setError("");
    } catch {
      setError("Seçimlər saxlanılmadı.");
    }
  };
  return (
    <>
      {saved && (
        <Toast
          title="Bildiriş seçimləri saxlanıldı"
          onClose={() => setSaved(false)}
        />
      )}
      {error && <p role="alert">{error}</p>}
      <section className="notification-settings">
        <SectionHeading title="Bildiriş seçimləri" />
        <Checkbox
          label="Tətbiqdaxili bildirişlər"
          checked={preferences.channels["in-app"]}
          onChange={() =>
            setPreferences({
              ...preferences,
              channels: {
                ...preferences.channels,
                "in-app": !preferences.channels["in-app"],
              },
            })
          }
        />
        <Checkbox
          label="Çempionluq məktubları"
          checked={preferences.channels.email}
          onChange={() =>
            setPreferences({
              ...preferences,
              channels: {
                ...preferences.channels,
                email: !preferences.channels.email,
              },
            })
          }
        />
        <Checkbox
          label="Push bildirişləri (xidmət tələb olunur)"
          disabled
          checked={preferences.channels.push}
          onChange={() =>
            setPreferences({
              ...preferences,
              channels: {
                ...preferences.channels,
                push: !preferences.channels.push,
              },
            })
          }
        />
        <SectionHeading title="Hadisələr" />
        {Object.entries(notificationEventLabels).map(([key, label]) => (
          <Checkbox
            key={key}
            label={label}
            checked={Boolean(preferences.events[key])}
            onChange={() => toggleEvent(key)}
          />
        ))}
        <Button onClick={() => void save()}>Seçimləri saxla</Button>
      </section>
    </>
  );
}
