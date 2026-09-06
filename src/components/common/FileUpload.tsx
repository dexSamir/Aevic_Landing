import '../../styles/components.css';
import { Upload } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { IMAGE_UPLOAD_TYPES, validateUpload, type FileValidator } from '../../utils/fileValidation';

export interface FileUploadProps {
  label: string;
  hint?: string;
  description?: string;
  accept?: readonly string[];
  maxBytes?: number;
  validators?: readonly FileValidator[];
  preview?: 'filename' | 'image' | 'none';
  errorMessage?: (error: string) => string;
  onFile?: (file: File) => void;
}

export function FileUpload({ label, hint, description, accept = IMAGE_UPLOAD_TYPES, maxBytes = 4 * 1024 * 1024, validators = [], preview = 'filename', errorMessage, onFile }: FileUploadProps) {
  const id = useId();
  const revision = useRef(0);
  const [fileName, setFileName] = useState('');
  const [image, setImage] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  useEffect(() => () => { revision.current += 1; }, []);
  useEffect(() => () => { if (image) URL.revokeObjectURL(image); }, [image]);
  return <div><label className="file-upload" htmlFor={id}>
    <input id={id} type="file" accept={accept.join(',')} aria-label={label} aria-describedby={id + '-description'} aria-invalid={Boolean(error)} aria-busy={pending} onChange={async (event) => {
      const files = Array.from(event.currentTarget.files ?? []);
      event.currentTarget.value = '';
      if (!files.length) return;
      const current = ++revision.current;
      setPending(true); setError('');
      const issue = await validateUpload(files, { accept, maxBytes, validators });
      if (current !== revision.current) return;
      setPending(false);
      if (issue) { setError(errorMessage?.(issue) ?? issue); return; }
      const file = files[0];
      setFileName(file.name);
      if (preview === 'image' && file.type.startsWith('image/')) setImage(URL.createObjectURL(file));
      else setImage('');
      onFile?.(file);
    }} />
    <Upload size={22} aria-hidden="true" /><span><strong>{pending ? 'Fayl yoxlanılır…' : preview !== 'none' && fileName ? fileName : label}</strong><small id={id + '-description'}>{description ?? hint ?? `${accept.join(', ')} · maksimum ${Math.round(maxBytes / 1024 / 1024)} MB`}</small></span>
    {image && <img src={image} alt="Seçilmiş faylın önbaxışı" width={64} height={64} />}
  </label>{error && <p className="field__message" role="alert">{error}</p>}</div>;
}
