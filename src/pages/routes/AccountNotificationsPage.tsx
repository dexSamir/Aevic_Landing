import { useEffect,useState } from "react";
import "../../app/workspaceStyles";
import {
Button,
Checkbox,
EmptyState,
LoadingSkeleton,
PageHeader,
SectionHeading,
Toast
} from "../../components/common/primitives";
import { services } from "../../services";
import type {
NotificationPreferences
} from "../../types/domain";

export function AccountNotificationsPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences>();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    services.notifications
      .preferences()
      .then(setPreferences)
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
      <PageHeader
        eyebrow="Bildiriş seçimləri"
        title="Bildiriş seçimləri"
        description="Sistem hadisələri admin mesajlarından ayrıdır. E-poçt və push bildirişləri üçün çatdırılma xidməti tələb olunur."
      />
      {saved && (
        <Toast
          title="Bildiriş seçimləri saxlanıldı"
          onClose={() => setSaved(false)}
        />
      )}
      {error && <p role="alert">{error}</p>}
      <section className="notification-settings">
        <SectionHeading title="Kanallar" />
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
          label="E-poçt bildirişləri (xidmət tələb olunur)"
          disabled
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
        <hr />
        <SectionHeading title="Hadisələr" />
        {[
          ["checkIn", "Check-in açıldıqda"],
          ["roomRelease", "Otaq məlumatı yayımlandıqda"],
          ["results", "Nəticə dərc edildikdə"],
          ["roster", "Heyət sorğusu dəyişdikdə"],
          ["achievements", "Nişan qazanıldıqda"],
        ].map(([key, label]) => (
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
