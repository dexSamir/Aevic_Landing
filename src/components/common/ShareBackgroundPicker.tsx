import { useState } from 'react';
import { FileUpload } from './FileUpload';
import { ImageEditor } from './ImageEditor';
import { Button } from './primitives';

/** Temporary export media. Never reads or writes the team's profile banner. */
export function ShareBackgroundPicker({ width, height, value, onChange, disabled = false }: {
  width: number; height: number; value?: File; onChange: (file?: File) => void; disabled?: boolean;
}) {
  const [editing, setEditing] = useState<File>();
  return <div className="share-background-picker">
    <FileUpload label="Kart fonu" preview="none" hint={`${width} × ${height} px · PNG, JPG və ya WebP · maksimum 4 MB`} accept={['image/png', 'image/jpeg', 'image/webp']} maxBytes={4_000_000} onFile={setEditing} disabled={disabled} />
    <p>{value ? 'Xüsusi fon seçilib.' : 'Rəsmi AEVIC fonu seçilib.'} Profil banneri dəyişmir.</p>
    <small>Yalnız bu açıq studiyada saxlanılır və PNG-yə daxil edilir. Səhifəni yenilədikdə, studiyadan və ya paylaşım növündən çıxdıqda itir; hesaba yüklənmir.</small>
    {value && <Button type="button" variant="ghost" disabled={disabled} onClick={() => onChange(undefined)}>AEVIC fonuna qayıt</Button>}
    {editing && <ImageEditor file={editing} width={width} height={height} fit="cover" title="Kartın fonunu düzəlt" onCancel={() => setEditing(undefined)} onApply={file => { onChange(file); setEditing(undefined); }} />}
  </div>;
}
