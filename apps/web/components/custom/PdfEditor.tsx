'use client';

import { Dropzone } from '@/components/Dropzone';
import { saveBlob } from '@/lib/download';
import { bytesToBlob, fileToBytes, runOp } from '@/lib/engine';
import {
  loadPdfJs,
  renderPageToBlob,
  type OverlayElement,
  type ImageInput,
} from '@mr-pdf/pdf-core';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Highlighter,
  ImagePlus,
  Loader2,
  PenLine,
  Signature as SignatureIcon,
  Square,
  Trash2,
  Type,
  Undo2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { SignaturePad } from './SignaturePad';

export type EditorMode = 'edit' | 'annotate' | 'sign' | 'redact';
type Tool = 'text' | 'highlight' | 'rect' | 'pen' | 'image' | 'signature';
type PdfDoc = Awaited<ReturnType<typeof loadPdfJs>>;

interface BaseEl {
  id: number;
  page: number;
}
type Element =
  | (BaseEl & { kind: 'text'; x: number; y: number; size: number; color: string; text: string })
  | (BaseEl & {
      kind: 'rect';
      x: number;
      y: number;
      w: number;
      h: number;
      color: string;
      opacity: number;
    })
  | (BaseEl & { kind: 'pen'; points: { x: number; y: number }[]; color: string; width: number })
  | (BaseEl & {
      kind: 'image';
      x: number;
      y: number;
      w: number;
      h: number;
      bytes: Uint8Array;
      url: string;
    });

const PDF_ACCEPT = { 'application/pdf': ['.pdf'] };
const SCALE = 1.4;

const TOOLS_BY_MODE: Record<EditorMode, Tool[]> = {
  edit: ['text', 'pen', 'rect', 'image'],
  annotate: ['highlight', 'pen', 'text'],
  sign: ['signature', 'text'],
  redact: ['rect'],
};

export function PdfEditor({ mode }: { mode: EditorMode }) {
  const [files, setFiles] = useState<File[]>([]);
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [page, setPage] = useState(0);
  const [bg, setBg] = useState<string | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [elements, setElements] = useState<Element[]>([]);
  const [tool, setTool] = useState<Tool>(TOOLS_BY_MODE[mode][0]!);
  const [color, setColor] = useState(mode === 'redact' ? '#000000' : '#e11d48');
  const [busy, setBusy] = useState(false);
  const [showPad, setShowPad] = useState(false);
  const [pendingImage, setPendingImage] = useState<Uint8Array | null>(null);
  const idRef = useRef(1);
  const draft = useRef<Element | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!files[0]) return;
      const bytes = await fileToBytes(files[0]);
      const loaded = await loadPdfJs(bytes);
      if (cancelled) return;
      setDoc(loaded);
      setPage(0);
      setElements([]);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [files]);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      if (!doc) return;
      const blob = await renderPageToBlob(doc, page + 1, { scale: SCALE, format: 'image/png' });
      const p = await doc.getPage(page + 1);
      const vp = p.getViewport({ scale: SCALE });
      if (cancelled) return;
      setSize({ w: vp.width, h: vp.height });
      setBg((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    }
    render();
    return () => {
      cancelled = true;
    };
  }, [doc, page]);

  const pageElements = elements.filter((e) => e.page === page);
  const newId = () => idRef.current++;

  function localPoint(e: React.PointerEvent) {
    const rect = overlayRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: React.PointerEvent) {
    const { x, y } = localPoint(e);

    if (tool === 'text') {
      setElements((prev) => [
        ...prev,
        { id: newId(), page, kind: 'text', x, y, size: 16, color, text: 'Text' },
      ]);
      return;
    }
    if (tool === 'signature') {
      if (!pendingImage) {
        setShowPad(true);
        return;
      }
      placeImage(pendingImage, x, y);
      setPendingImage(null);
      return;
    }
    if (tool === 'image') {
      if (pendingImage) {
        placeImage(pendingImage, x, y);
        setPendingImage(null);
      }
      return;
    }
    // Drag-based tools (rect/highlight/pen).
    overlayRef.current?.setPointerCapture(e.pointerId);
    if (tool === 'pen') {
      draft.current = { id: newId(), page, kind: 'pen', points: [{ x, y }], color, width: 2 };
    } else {
      const opacity = tool === 'highlight' ? 0.4 : mode === 'redact' ? 1 : 0.5;
      const c = tool === 'highlight' ? '#fde047' : color;
      draft.current = { id: newId(), page, kind: 'rect', x, y, w: 0, h: 0, color: c, opacity };
    }
    setElements((prev) => [...prev, draft.current!]);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!draft.current) return;
    const { x, y } = localPoint(e);
    const d = draft.current;
    setElements((prev) =>
      prev.map((el) => {
        if (el.id !== d.id) return el;
        if (el.kind === 'pen') return { ...el, points: [...el.points, { x, y }] };
        if (el.kind === 'rect') return { ...el, w: x - el.x, h: y - el.y };
        return el;
      }),
    );
  }

  function onPointerUp() {
    if (draft.current?.kind === 'rect') {
      // Normalize negative rectangles.
      setElements((prev) =>
        prev.map((el) =>
          el.id === draft.current!.id && el.kind === 'rect'
            ? {
                ...el,
                x: el.w < 0 ? el.x + el.w : el.x,
                y: el.h < 0 ? el.y + el.h : el.y,
                w: Math.abs(el.w),
                h: Math.abs(el.h),
              }
            : el,
        ),
      );
    }
    draft.current = null;
  }

  function placeImage(bytes: Uint8Array, x: number, y: number) {
    const url = URL.createObjectURL(bytesToBlob(bytes, 'image/png'));
    const img = new Image();
    img.onload = () => {
      const w = 180;
      const h = (img.height / img.width) * w;
      setElements((prev) => [
        ...prev,
        { id: newId(), page, kind: 'image', x, y, w, h, bytes, url },
      ]);
    };
    img.src = url;
  }

  function undo() {
    setElements((prev) => {
      const idx = [...prev].map((e) => e.page).lastIndexOf(page);
      if (idx === -1) return prev;
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function onUploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingImage(await fileToBytes(file));
  }

  async function exportPdf() {
    if (!files[0]) return;
    setBusy(true);
    try {
      const bytes = await fileToBytes(files[0]);
      const outName = files[0].name.replace(/\.pdf$/i, '') + `-${mode}.pdf`;
      if (mode === 'redact') {
        const out = await rasterizeWithRedactions(bytes);
        saveBlob(bytesToBlob(out), outName);
      } else {
        const overlay = elements.map(toOverlay);
        const out = await runOp<Uint8Array>('applyOverlay', [bytes, overlay]);
        saveBlob(bytesToBlob(out), outName);
      }
    } finally {
      setBusy(false);
    }
  }

  /** Convert a display-space element to a point-space overlay element. */
  function toOverlay(el: Element): OverlayElement {
    const c = hexToRgb01(
      el.kind === 'pen' || el.kind === 'rect' || el.kind === 'text' ? el.color : '#000',
    );
    if (el.kind === 'text') {
      return {
        type: 'text',
        page: el.page,
        x: el.x / SCALE,
        y: el.y / SCALE,
        size: el.size / SCALE,
        color: c,
        text: el.text,
      };
    }
    if (el.kind === 'rect') {
      return {
        type: 'rect',
        page: el.page,
        x: el.x / SCALE,
        y: el.y / SCALE,
        width: el.w / SCALE,
        height: el.h / SCALE,
        color: c,
        opacity: el.opacity,
      };
    }
    if (el.kind === 'pen') {
      return {
        type: 'line',
        page: el.page,
        points: el.points.map((p) => ({ x: p.x / SCALE, y: p.y / SCALE })),
        color: c,
        width: el.width,
      };
    }
    return {
      type: 'image',
      page: el.page,
      x: el.x / SCALE,
      y: el.y / SCALE,
      width: el.w / SCALE,
      height: el.h / SCALE,
      pngBytes: el.bytes,
    };
  }

  /** For redaction, rasterize every page and burn black boxes so content is removed. */
  async function rasterizeWithRedactions(bytes: Uint8Array): Promise<Uint8Array> {
    const d = await loadPdfJs(bytes);
    const exportScale = 2;
    const images: ImageInput[] = [];
    for (let i = 1; i <= d.numPages; i++) {
      const p = await d.getPage(i);
      const vp = p.getViewport({ scale: exportScale });
      const canvas = document.createElement('canvas');
      canvas.width = vp.width;
      canvas.height = vp.height;
      const ctx = canvas.getContext('2d')!;
      await p.render({ canvasContext: ctx, viewport: vp }).promise;
      // Map display-space rects (SCALE) to export-space (exportScale).
      const ratio = exportScale / SCALE;
      elements
        .filter(
          (e): e is Extract<Element, { kind: 'rect' }> => e.kind === 'rect' && e.page === i - 1,
        )
        .forEach((r) => {
          ctx.fillStyle = '#000';
          ctx.fillRect(r.x * ratio, r.y * ratio, r.w * ratio, r.h * ratio);
        });
      const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'));
      images.push({ bytes: await fileToBytes(blob), type: 'png' });
    }
    await d.destroy();
    return runOp<Uint8Array>('imagesToPdf', [images, { pageSize: 'fit' }]);
  }

  if (!doc) {
    return (
      <div className="surface p-5">
        <Dropzone accept={PDF_ACCEPT} multiple={false} files={files} onChange={setFiles} />
      </div>
    );
  }

  const availableTools = TOOLS_BY_MODE[mode];

  return (
    <div className="space-y-4">
      <div className="surface flex flex-wrap items-center gap-2 p-3">
        {availableTools.map((t) => (
          <button
            key={t}
            className={tool === t ? 'btn-primary h-9' : 'btn-ghost h-9'}
            onClick={() => {
              setTool(t);
              if (t === 'signature') setShowPad(true);
            }}
          >
            <ToolIcon tool={t} /> {labelFor(t)}
          </button>
        ))}

        {tool === 'image' && (
          <label className="btn-ghost h-9 cursor-pointer">
            <ImagePlus className="h-4 w-4" />{' '}
            {pendingImage ? 'Click page to place' : 'Choose image'}
            <input type="file" accept="image/*" className="hidden" onChange={onUploadImage} />
          </label>
        )}

        {mode !== 'redact' && tool !== 'highlight' && tool !== 'signature' && tool !== 'image' && (
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-9 cursor-pointer rounded border border-[hsl(var(--border))]"
            aria-label="Color"
          />
        )}

        <div className="ml-auto flex items-center gap-2">
          <button className="btn-ghost h-9" onClick={undo}>
            <Undo2 className="h-4 w-4" /> Undo
          </button>
          <button
            className="btn-ghost h-9"
            onClick={() => setElements((p) => p.filter((e) => e.page !== page))}
          >
            <Trash2 className="h-4 w-4" /> Clear page
          </button>
          <button className="btn-primary h-9" disabled={busy} onClick={exportPdf}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export
          </button>
        </div>
      </div>

      <div className="surface flex items-center justify-center gap-3 p-2 text-sm">
        <button
          className="btn-ghost h-8 w-8 p-0"
          disabled={page <= 0}
          onClick={() => setPage((p) => p - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        Page {page + 1} / {doc.numPages}
        <button
          className="btn-ghost h-8 w-8 p-0"
          disabled={page >= doc.numPages - 1}
          onClick={() => setPage((p) => p + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button className="btn-ghost h-8" onClick={() => setFiles([])}>
          Change file
        </button>
      </div>

      <div className="surface overflow-auto p-4">
        <div className="relative mx-auto" style={{ width: size.w, height: size.h }}>
          {bg && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bg}
              alt={`Page ${page + 1}`}
              className="absolute inset-0 select-none"
              draggable={false}
            />
          )}
          <div
            ref={overlayRef}
            className="absolute inset-0 touch-none"
            style={{ cursor: 'crosshair' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            {pageElements.map((el) => (
              <ElementView
                key={el.id}
                el={el}
                onTextChange={(text) =>
                  setElements((prev) => prev.map((e) => (e.id === el.id ? { ...e, text } : e)))
                }
              />
            ))}
          </div>
        </div>
      </div>

      {showPad && (
        <SignaturePad
          onClose={() => setShowPad(false)}
          onConfirm={async (dataUrl) => {
            setShowPad(false);
            const res = await fetch(dataUrl);
            setPendingImage(new Uint8Array(await res.arrayBuffer()));
            setTool('signature');
          }}
        />
      )}
    </div>
  );
}

function ElementView({ el, onTextChange }: { el: Element; onTextChange: (text: string) => void }) {
  if (el.kind === 'rect') {
    return (
      <div
        className="absolute"
        style={{
          left: el.x,
          top: el.y,
          width: el.w,
          height: el.h,
          background: el.color,
          opacity: el.opacity,
        }}
      />
    );
  }
  if (el.kind === 'image') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={el.url}
        alt="overlay"
        className="absolute"
        style={{ left: el.x, top: el.y, width: el.w, height: el.h }}
      />
    );
  }
  if (el.kind === 'text') {
    return (
      <input
        value={el.text}
        onChange={(e) => onTextChange(e.target.value)}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute bg-transparent outline-none"
        style={{ left: el.x, top: el.y, color: el.color, fontSize: el.size, minWidth: 40 }}
      />
    );
  }
  // pen
  const d = el.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full">
      <path d={d} stroke={el.color} strokeWidth={el.width} fill="none" />
    </svg>
  );
}

function ToolIcon({ tool }: { tool: Tool }) {
  const cls = 'h-4 w-4';
  if (tool === 'text') return <Type className={cls} />;
  if (tool === 'highlight') return <Highlighter className={cls} />;
  if (tool === 'rect') return <Square className={cls} />;
  if (tool === 'pen') return <PenLine className={cls} />;
  if (tool === 'image') return <ImagePlus className={cls} />;
  return <SignatureIcon className={cls} />;
}

function labelFor(tool: Tool): string {
  return {
    text: 'Text',
    highlight: 'Highlight',
    rect: 'Box',
    pen: 'Draw',
    image: 'Image',
    signature: 'Signature',
  }[tool];
}

function hexToRgb01(hex: string): { r: number; g: number; b: number } {
  const m = hex.replace('#', '').match(/^([0-9a-f]{6})$/i);
  if (!m) return { r: 0, g: 0, b: 0 };
  const v = m[1]!;
  return {
    r: parseInt(v.slice(0, 2), 16) / 255,
    g: parseInt(v.slice(2, 4), 16) / 255,
    b: parseInt(v.slice(4, 6), 16) / 255,
  };
}
