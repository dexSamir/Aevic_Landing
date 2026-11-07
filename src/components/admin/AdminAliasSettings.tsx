import { useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { Button, Input } from '../common/primitives';
import { services } from '../../services';

export function AdminAliasSettings({ alias, displayName }: { alias: string | null; displayName: string }) {
  const [value, setValue] = useState(alias ?? ''),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [error, setError] = useState('');
  const valid =
    !value.trim() ||
    (/^[\p{L}\p{N}][\p{L}\p{M}\p{N} ._-]{1,31}$/u.test(value.trim()) &&
      value.trim().toLowerCase() !== 'aevic admin');
  return (
    <form
      className="comm-panel"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid || busy) return;
        setBusy(true);
        setError('');
        setNotice('');
        try {
          const next = await services.admin.updateAlias(value.trim() || null);
          setValue(next.alias ?? '');
          setNotice('Admin imzası saxlanıldı.');
        } catch (e) {
          setError(
            (e as { code?: string }).code === 'ALIAS_IN_USE'
              ? 'Bu ad artıq istifadə olunur.'
              : 'İmza saxlanılmadı.',
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <header className="comm-heading">
        <BadgeCheck />
        <h2>Admin imzası</h2>
      </header>
      <Input
        label="Görünən ad"
        value={value}
        maxLength={32}
        placeholder="AEVIC Admin"
        hint="2–32 simvol. Boş saxlasanız, elanlarda AEVIC Admin görünəcək."
        onChange={(e) => {
          setValue(e.target.value);
          setNotice('');
        }}
      />
      <footer className="comm-actions">
        <span>Cari imza · {displayName}</span>
        <Button type="submit" loading={busy} disabled={!valid || value.trim() === (alias ?? '')}>
          İmzanı saxla
        </Button>
      </footer>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
