'use client';

import { Eraser, X } from 'lucide-react';
import { useRef, useState } from 'react';

interface SignaturePadProps {
  onClose: () => void;
  /** Returns a transparent PNG data URL of the signature. */
  onConfirm: (dataUrl: string) => void;
}

/** Modal to create a signature by drawing or typing. */
export function SignaturePad({ onClose, onConfirm }: SignaturePadProps) {
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [typed, setTyped] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  function pos(e: React.PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent) {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = pos(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111';
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  function end() {
    drawing.current = false;
  }
  function clear() {
    const c = canvasRef.current!;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
  }

  function confirm() {
    if (mode === 'type') {
      const c = document.createElement('canvas');
      c.width = 600;
      c.height = 200;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#111';
      ctx.font = '64px "Segoe Script", cursive';
      ctx.textBaseline = 'middle';
      ctx.fillText(typed || 'Signature', 20, 100);
      onConfirm(c.toDataURL('image/png'));
    } else {
      onConfirm(canvasRef.current!.toDataURL('image/png'));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="surface w-full max-w-lg p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Create signature</h3>
          <button className="btn-ghost h-8 w-8 p-0" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-3 flex gap-2">
          <button
            className={mode === 'draw' ? 'btn-primary h-8' : 'btn-ghost h-8'}
            onClick={() => setMode('draw')}
          >
            Draw
          </button>
          <button
            className={mode === 'type' ? 'btn-primary h-8' : 'btn-ghost h-8'}
            onClick={() => setMode('type')}
          >
            Type
          </button>
        </div>

        {mode === 'draw' ? (
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={520}
              height={200}
              className="w-full touch-none rounded-lg border border-[hsl(var(--border))] bg-white"
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={end}
              onPointerLeave={end}
            />
            <button className="btn-ghost absolute right-2 top-2 h-8" onClick={clear}>
              <Eraser className="h-4 w-4" /> Clear
            </button>
          </div>
        ) : (
          <input
            className="input text-2xl"
            style={{ fontFamily: 'cursive' }}
            placeholder="Type your name"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={confirm}>
            Add signature
          </button>
        </div>
      </div>
    </div>
  );
}
