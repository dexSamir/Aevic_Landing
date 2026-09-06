export const IMAGE_UPLOAD_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const EVIDENCE_UPLOAD_TYPES = [...IMAGE_UPLOAD_TYPES, 'application/pdf'] as const;
export type FileValidator = (file: File) => string | undefined | Promise<string | undefined>;
const extensions: Record<string, string[]> = { 'image/png': ['png'], 'image/jpeg': ['jpg', 'jpeg'], 'image/webp': ['webp'], 'application/pdf': ['pdf'] };

function readHeader(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('File cannot be read'));
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.readAsArrayBuffer(file.slice(0, 16));
  });
}

export async function validateUpload(files: readonly File[], options: { accept: readonly string[]; maxBytes: number; validators?: readonly FileValidator[] }) {
  if (files.length !== 1) return 'Yalnız bir fayl seçin.';
  const file = files[0];
  if (!file.size) return 'Boş fayl qəbul edilmir.';
  if (file.size > options.maxBytes) return `Fayl ${Math.round(options.maxBytes / 1024 / 1024)} MB limitini aşır.`;
  const extension = file.name.split('.').slice(-1)[0]?.toLowerCase() ?? '';
  if (!options.accept.includes(file.type) || !extensions[file.type]?.includes(extension)) return 'Faylın növü və uzantısı qəbul edilən formatla uyğun olmalıdır.';
  try {
    const bytes = await readHeader(file);
    const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
    const signature = file.type === 'image/png' ? [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)
      : file.type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : file.type === 'image/webp' ? ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP'
      : file.type === 'application/pdf' && ascii(0, 5) === '%PDF-';
    if (!signature) return 'Faylın məzmunu seçilən formatla uyğun deyil.';
    for (const validator of options.validators ?? []) { const error = await validator(file); if (error) return error; }
  } catch { return 'Fayl oxunmadı. Yenidən seçin.'; }
  return undefined;
}
