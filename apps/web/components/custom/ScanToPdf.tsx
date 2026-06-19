'use client';

import { Dropzone } from '@/components/Dropzone';
import { saveBlob } from '@/lib/download';
import { bytesToBlob, fileToBytes, runOp } from '@/lib/engine';
import { normalizeImageToPng, type ImageInput } from '@mr-pdf/pdf-core';
import { Camera, CameraOff, Download, Loader2, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Shot {
  url: string;
  blob: Blob;
}

export function ScanToPdf() {
  const [files, setFiles] = useState<File[]>([]);
  const [shots, setShots] = useState<Shot[]>([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      setError('Could not access the camera. You can still upload images below.');
    }
  }

  async function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.92));
    if (blob) setShots((prev) => [...prev, { url: URL.createObjectURL(blob), blob }]);
  }

  async function exportPdf() {
    setBusy(true);
    setError(null);
    try {
      const inputs: ImageInput[] = [];
      for (const file of files) {
        const isJpgPng = /jpe?g|png/i.test(file.type);
        inputs.push(
          isJpgPng
            ? { bytes: await fileToBytes(file), type: /png/i.test(file.type) ? 'png' : 'jpg' }
            : { bytes: await normalizeImageToPng(file), type: 'png' },
        );
      }
      for (const shot of shots) {
        inputs.push({ bytes: await fileToBytes(shot.blob), type: 'jpg' });
      }
      if (inputs.length === 0) throw new Error('Add at least one photo or image.');
      const out = await runOp<Uint8Array>('imagesToPdf', [inputs, { pageSize: 'A4', margin: 20 }]);
      saveBlob(bytesToBlob(out), 'scan.pdf');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setBusy(false);
    }
  }

  const total = files.length + shots.length;

  return (
    <div className="space-y-4">
      <div className="surface p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          {!cameraOn ? (
            <button className="btn-ghost" onClick={startCamera}>
              <Camera className="h-4 w-4" /> Use camera
            </button>
          ) : (
            <>
              <button className="btn-primary" onClick={capture}>
                <Camera className="h-4 w-4" /> Capture
              </button>
              <button className="btn-ghost" onClick={stopCamera}>
                <CameraOff className="h-4 w-4" /> Stop camera
              </button>
            </>
          )}
        </div>

        {cameraOn && (
          <video ref={videoRef} className="mb-4 w-full rounded-lg bg-black" playsInline muted />
        )}

        <Dropzone
          accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }}
          multiple
          files={files}
          onChange={setFiles}
          label="Or upload images / scans"
        />
      </div>

      {shots.length > 0 && (
        <div className="surface p-5">
          <p className="label">Captured photos</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {shots.map((shot, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shot.url} alt={`Shot ${i + 1}`} className="rounded-lg" />
                <button
                  className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white"
                  onClick={() => setShots((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {error}
        </p>
      )}

      <button className="btn-primary" disabled={busy || total === 0} onClick={exportPdf}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        Create PDF ({total})
      </button>
    </div>
  );
}
