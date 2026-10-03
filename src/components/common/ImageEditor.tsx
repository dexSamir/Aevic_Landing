import '../../styles/image-editor.css';
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "./primitives";

/** Shared aspect-locked crop. Only confirmation creates the upload/export file. */
export function ImageEditor({
  file,
  width = 1024, height = 1024, fit = "cover", title = "Komanda loqosunu düzəlt",
  onCancel,
  onApply,
}: {
  file: File;
  width?: number; height?: number; title?: string; fit?: "contain" | "cover";
  onCancel: () => void;
  onApply: (file: File) => void;
}) {
  const titleId = useId();
  const minimumZoom = fit === "cover" ? 1 : 0.25;
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const drag = useRef<{ x: number; y: number; start: typeof offset } | null>(
    null,
  );
  const mounted = useRef(true);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = dialog.current;
    node?.showModal();
    return () => {
      node?.close();
      previous?.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    mounted.current = true;
    let active = true;
    setSource(null); setError(""); setZoom(1); setRotation(0); setOffset({ x: 0, y: 0 });
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (active) {
        if(img.naturalWidth*img.naturalHeight>20_000_000){setError("Şəkil 20 meqapikseldən böyükdür. Daha kiçik şəkil seçin.");return;}
        setSource(img);
      }
    };
    img.onerror = () => {
      if (active)
        setError("Şəkli açmaq mümkün olmadı. Başqa şəkil seçin.");
    };
    img.src = url;
    return () => {
      active = false;
      mounted.current = false;
      URL.revokeObjectURL(url);
    };
  }, [file]);
  const draw = (target: HTMLCanvasElement) => {
    const context = target.getContext("2d");
    if (!context || !source) return;
    const size = target.width, tall = target.height;
    const turned = Math.abs(rotation % 180) === 90;
    const sw = turned ? source.naturalHeight : source.naturalWidth;
    const sh = turned ? source.naturalWidth : source.naturalHeight;
    const scale = (fit === "cover" ? Math.max(size / sw, tall / sh) : Math.min(size / sw, tall / sh)) * zoom;
    const x = fit === "contain" ? size * offset.x : Math.max(-(sw * scale - size) / 2, Math.min((sw * scale - size) / 2, size * offset.x));
    const y = fit === "contain" ? tall * offset.y : Math.max(-(sh * scale - tall) / 2, Math.min((sh * scale - tall) / 2, tall * offset.y));
    context.clearRect(0, 0, size, tall);
    context.save();
    context.translate(size / 2 + x, tall / 2 + y);
    context.rotate((rotation * Math.PI) / 180);
    context.scale(scale, scale);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      source,
      -source.naturalWidth / 2,
      -source.naturalHeight / 2,
    );
    context.restore();
  };
  useEffect(() => {
    if (canvas.current) draw(canvas.current);
  }, [source, zoom, rotation, offset, width, height, fit]);
  const move = (x: number, y: number) => {
    if (!source || saving) return;
    const turned = Math.abs(rotation % 180) === 90;
    const sw = turned ? source.naturalHeight : source.naturalWidth;
    const sh = turned ? source.naturalWidth : source.naturalHeight;
    const scale = Math.max(width / sw, height / sh) * zoom;
    const limitX = fit === "cover" ? Math.max(0, (sw * scale - width) / (2 * width)) : 1;
    const limitY = fit === "cover" ? Math.max(0, (sh * scale - height) / (2 * height)) : 1;
    const next = { x: Math.max(-limitX, Math.min(limitX, x)), y: Math.max(-limitY, Math.min(limitY, y)) };
    setOffset(next);
    return next;
  };
  // Clamp the stored position too, so dragging back from an edge responds immediately.
  useEffect(() => { move(offset.x, offset.y); }, [zoom, rotation, source]);
  const save = async () => {
    if (!source || saving) return;
    setSaving(true); setError("");
    try {
      const output = document.createElement("canvas");
      output.width = width; output.height = height;
      draw(output);
      const encode = (type: string, quality?: number) => new Promise<Blob | null>(resolve => output.toBlob(resolve, type, quality));
      let blob = await encode("image/png");
      // Preserve dimensions and transparency; compress photographic crops only if needed.
      for (const quality of [0.95, 0.9, 0.85]) {
        if (blob && blob.size <= 4_000_000) break;
        blob = await encode("image/webp", quality);
      }
      if (!mounted.current) return;
      if (!blob || blob.size > 4_000_000) throw new Error("size");
      onApply(new File([blob], `team-image.${blob.type === 'image/webp' ? 'webp' : 'png'}`, { type: blob.type }));
    } catch {
      if (mounted.current) setError("Şəkil 4 MB həddində hazırlana bilmədi. Başqa şəkil seçin.");
    } finally { if (mounted.current) setSaving(false); }
  };
  return createPortal(
    <dialog
      ref={dialog}
      className="team-logo-editor"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = [
          ...event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), [tabindex="0"]',
          ),
        ];
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus({ preventScroll: true });
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus({ preventScroll: true });
        }
      }}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
        <p>{width} × {height} px · Çərçivədə görünən hissə saxlanılır. Sürüşdürün və ölçünü seçin.</p>
      </header>
      <canvas
        ref={canvas}
        width={width}
        height={height}
        style={{ aspectRatio: `${width} / ${height}`, width: `min(100%, 360px, ${48*width/height}dvh)` }}
        tabIndex={0}
        aria-label="Şəkil kəsimi. Mövqeyi dəyişmək üçün ox düymələrindən istifadə edin."
        onKeyDown={(event) => {
          const delta: Record<string, [number, number]> = {
            ArrowLeft: [-0.02, 0],
            ArrowRight: [0.02, 0],
            ArrowUp: [0, -0.02],
            ArrowDown: [0, 0.02],
          };
          if (delta[event.key]) {
            event.preventDefault();
            const [x, y] = delta[event.key];
            move(offset.x + x, offset.y + y);
          }
        }}
        onPointerDown={(event) => {
          if (saving || !source || event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { x: event.clientX, y: event.clientY, start: offset };
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          const size = event.currentTarget.getBoundingClientRect().width;
          const next = move(
            drag.current.start.x + (event.clientX - drag.current.x) / size,
            drag.current.start.y + (event.clientY - drag.current.y) / event.currentTarget.getBoundingClientRect().height,
          );
          if (next) drag.current = { x: event.clientX, y: event.clientY, start: next };
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onLostPointerCapture={() => { drag.current = null; }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      />
      <fieldset disabled={saving || !source} className="image-editor-adjustments"><legend className="sr-only">Şəkil düzəlişləri</legend><div className="logo-editor-controls">
        <button
          type="button"
          aria-label="Kiçilt"
          disabled={zoom <= minimumZoom}
          onClick={() => setZoom((value) => Math.max(minimumZoom, value - 0.1))}
        >
          <ZoomOut size={18} />
        </button>
        <label>
          Ölçü{" "}
          <input
            aria-label="Şəkil ölçüsü"
            type="range"
            min={minimumZoom}
            max="4"
            step="0.05"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
        </label>
        <button
          type="button"
          aria-label="Böyüt"
          disabled={zoom >= 4}
          onClick={() => setZoom((value) => Math.min(4, value + 0.1))}
        >
          <ZoomIn size={18} />
        </button>
        <button
          type="button"
          aria-label="Sola döndər"
          onClick={() => setRotation((value) => value - 90)}
        >
          <RotateCcw size={18} />
        </button>
        <button
          type="button"
          aria-label="Sağa döndər"
          onClick={() => setRotation((value) => value + 90)}
        >
          <RotateCw size={18} />
        </button>
        <button
          type="button"
          onClick={() => {
            setZoom(1);
            setRotation(0);
            setOffset({ x: 0, y: 0 });
          }}
        >
          Sıfırla
        </button>
      </div>
      <div className="logo-editor-position" aria-label="Şəkil mövqeyi">
        {[
          { label: "Sola çək", icon: ArrowLeft, x: -0.02, y: 0 },
          { label: "Yuxarı çək", icon: ArrowUp, x: 0, y: -0.02 },
          { label: "Aşağı çək", icon: ArrowDown, x: 0, y: 0.02 },
          { label: "Sağa çək", icon: ArrowRight, x: 0.02, y: 0 },
        ].map(({ label, icon: Icon, x, y }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            onClick={() => move(offset.x + x, offset.y + y)}
          >
            <Icon size={16} />
          </button>
        ))}
      </div>
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <footer>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Ləğv et
        </Button>
        <Button
          type="button"
          disabled={!source || saving}
          loading={saving}
          onClick={() => void save()}
        >
          Tətbiq et
        </Button>
      </footer>
    </dialog>,
    document.body,
  );
}
