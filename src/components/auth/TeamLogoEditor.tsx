import { useEffect, useRef, useState } from "react";
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
import { Button } from "../common/primitives";

/** Local square composition. Canvas stays transparent; only confirmation creates an output blob. */
export function TeamLogoEditor({
  file,
  onCancel,
  onApply,
}: {
  file: File;
  onCancel: () => void;
  onApply: (file: File) => void;
}) {
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
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (mounted.current) setSource(img);
    };
    img.onerror = () => {
      if (mounted.current)
        setError("Şəkli açmaq mümkün olmadı. Başqa şəkil seçin.");
    };
    img.src = url;
    return () => {
      mounted.current = false;
      URL.revokeObjectURL(url);
    };
  }, [file]);
  const draw = (target: HTMLCanvasElement) => {
    const context = target.getContext("2d");
    if (!context || !source) return;
    const size = target.width;
    context.clearRect(0, 0, size, size);
    context.save();
    context.translate(size * (0.5 + offset.x), size * (0.5 + offset.y));
    context.rotate((rotation * Math.PI) / 180);
    const scale =
      (size / Math.max(source.naturalWidth, source.naturalHeight)) * zoom;
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
  }, [source, zoom, rotation, offset]);
  const move = (x: number, y: number) =>
    setOffset({
      x: Math.max(-1, Math.min(1, x)),
      y: Math.max(-1, Math.min(1, y)),
    });
  const save = () => {
    if (!source || saving) return;
    setSaving(true);
    const output = document.createElement("canvas");
    output.width = output.height = 1024;
    draw(output);
    output.toBlob((blob) => {
      if (!mounted.current) return;
      if (!blob) {
        setError("Şəkli hazırlamaq mümkün olmadı. Yenidən cəhd edin.");
        setSaving(false);
        return;
      }
      onApply(new File([blob], "team-logo.png", { type: "image/png" }));
    }, "image/png");
  };
  return createPortal(
    <dialog
      ref={dialog}
      className="team-logo-editor"
      aria-labelledby="logo-editor-title"
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
        <h2 id="logo-editor-title">Komanda loqosunu düzəlt</h2>
        <p>Kvadrat çərçivədə sürüşdürün və ölçünü seçin. Şəffaflıq qorunur.</p>
      </header>
      <canvas
        ref={canvas}
        width={512}
        height={512}
        tabIndex={0}
        aria-label="Loqo kəsimi. Mövqeyi dəyişmək üçün ox düymələrindən istifadə edin."
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
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { x: event.clientX, y: event.clientY, start: offset };
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          const size = event.currentTarget.getBoundingClientRect().width;
          move(
            drag.current.start.x + (event.clientX - drag.current.x) / size,
            drag.current.start.y + (event.clientY - drag.current.y) / size,
          );
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      />
      <div className="logo-editor-controls">
        <button
          type="button"
          aria-label="Kiçilt"
          disabled={zoom <= 0.25}
          onClick={() => setZoom((value) => Math.max(0.25, value - 0.1))}
        >
          <ZoomOut size={18} />
        </button>
        <label>
          Ölçü{" "}
          <input
            aria-label="Loqo ölçüsü"
            type="range"
            min="0.25"
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
      <div className="logo-editor-position" aria-label="Loqo mövqeyi">
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
      {error && <p role="alert">{error}</p>}
      <footer>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Ləğv et
        </Button>
        <Button
          type="button"
          disabled={!source || saving}
          loading={saving}
          onClick={save}
        >
          Tətbiq et
        </Button>
      </footer>
    </dialog>,
    document.body,
  );
}
