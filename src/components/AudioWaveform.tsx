/**
 * AudioWaveform — reusable waveform canvas for audio files.
 *
 * Approach: fetch() + AudioContext.decodeAudioData() + RMS downsampling.
 *
 * CORS / Dropbox note:
 *   Dropbox `dl.dropboxusercontent.com?raw=1` URLs serve
 *   `Access-Control-Allow-Origin: *` so direct browser fetch works.
 *
 *   If you encounter CORS errors (e.g. after a Dropbox policy change, or for
 *   other storage providers), add a backend proxy and replace the body of
 *   `fetchAudioForWaveform` with:
 *
 *     const res = await fetch(
 *       `/api/audio-proxy?url=${encodeURIComponent(url)}`
 *     );
 *     return res.arrayBuffer();
 *
 * Features:
 *   - Proper waveform from RMS-downsampled AudioBuffer channel data
 *   - Playhead indicator line
 *   - Comment / cue-point markers as dots at the bottom
 *   - Seeks when user clicks anywhere on the bar
 *   - ResizeObserver redraws when container resizes
 *   - Polished loading skeleton + CORS/decode error fallback
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Radio } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Number of amplitude bars to downsample the decoded audio into. */
const BAR_COUNT = 180;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WaveformMarker {
  /** Unique key for React */
  id: string;
  /** Position in seconds */
  time: number;
  /** Dot color (CSS color string). Defaults to blue-500. */
  color?: string;
}

interface AudioWaveformProps {
  /** Direct URL to audio file. Dropbox raw URLs and Supabase storage URLs both work. */
  audioUrl: string;
  /** Current playback position in seconds (from audio.currentTime) */
  currentTime: number;
  /** Total duration in seconds (from audio.duration) */
  duration: number;
  /** Called with the target time (seconds) when user clicks to seek */
  onSeek: (time: number) => void;
  /** Optional cue-point markers (e.g. from review comments with timestamps) */
  markers?: WaveformMarker[];
  /** Canvas height in px. Defaults to 64. */
  height?: number;
  /** Tailwind / CSS class appended to the outer wrapper */
  className?: string;
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

/**
 * Download audio bytes for waveform decoding.
 *
 * PROXY POINT — if direct CORS fetch fails, replace this body with a proxy
 * call: `return fetch(`/api/audio-proxy?url=${encodeURIComponent(url)}`).then(r => r.arrayBuffer())`
 */
async function fetchAudioForWaveform(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.arrayBuffer();
}

// ─── Decode ───────────────────────────────────────────────────────────────────

/** Decode an ArrayBuffer and return RMS-normalized peaks (0–1, length = BAR_COUNT). */
async function decodeWaveform(buf: ArrayBuffer): Promise<Float32Array> {
  const actx = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await actx.decodeAudioData(buf);
  } finally {
    actx.close();
  }

  const raw       = decoded.getChannelData(0);
  const blockSize = Math.floor(raw.length / BAR_COUNT);
  const peaks     = new Float32Array(BAR_COUNT);

  for (let i = 0; i < BAR_COUNT; i++) {
    let sum = 0;
    const start = i * blockSize;
    const end   = start + blockSize;
    for (let j = start; j < end; j++) sum += raw[j] * raw[j];
    peaks[i] = Math.sqrt(sum / blockSize); // RMS
  }

  // Normalize to 0–1
  let max = 0;
  for (let i = 0; i < peaks.length; i++) if (peaks[i] > max) max = peaks[i];
  if (max > 0) for (let i = 0; i < peaks.length; i++) peaks[i] /= max;

  return peaks;
}

// ─── Canvas draw ──────────────────────────────────────────────────────────────

function drawCanvas(
  canvas: HTMLCanvasElement,
  peaks: Float32Array,
  progress: number, // 0–1
  markers: WaveformMarker[],
  duration: number,
): void {
  const dpr  = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const W    = rect.width;
  const H    = rect.height;

  if (!W || !H) return;

  canvas.width  = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const bars  = peaks.length;
  const gap   = Math.max(0.8, W * 0.003);          // ~0.3% gap between bars
  const barW  = (W - gap * (bars - 1)) / bars;
  const midY  = H / 2;
  const r     = Math.min(barW * 0.5, 2.5);          // corner radius

  for (let i = 0; i < bars; i++) {
    const x      = i * (barW + gap);
    const amp    = peaks[i];
    const halfH  = Math.max(1.5, amp * midY * 0.88);
    const y      = midY - halfH;
    const h      = halfH * 2;
    const played = i / bars < progress;

    ctx.beginPath();

    // `roundRect` was added in Chrome 99 / Firefox 112 — fall back to `rect`
    if (typeof (ctx as CanvasRenderingContext2D & { roundRect?: unknown }).roundRect === 'function') {
      (ctx as any).roundRect(x, y, barW, h, r);
    } else {
      ctx.rect(x, y, barW, h);
    }

    ctx.fillStyle = played ? '#2563eb' : '#e2e8f0'; // blue-600 / slate-200
    ctx.fill();
  }

  // ── Playhead vertical line ──
  if (progress > 0 && progress < 1) {
    const px = progress * W;
    ctx.beginPath();
    ctx.moveTo(px, midY - H * 0.46);
    ctx.lineTo(px, midY + H * 0.46);
    ctx.strokeStyle = '#1d4ed8'; // blue-700
    ctx.lineWidth   = 1.5;
    ctx.stroke();
  }

  // ── Comment / cue markers ──
  if (duration > 0) {
    for (const m of markers) {
      const mx = (m.time / duration) * W;
      ctx.beginPath();
      ctx.arc(mx, H - 7, 3.5, 0, Math.PI * 2);
      ctx.fillStyle   = m.color ?? '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    }
  }
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

/** Deterministic waveform-like heights so the skeleton doesn't jump on re-render. */
const SKELETON_HEIGHTS = Array.from(
  { length: 60 },
  (_, i) => 20 + 70 * Math.abs(Math.sin(i * 0.55 + 0.3)),
);

function LoadingSkeleton({ height }: { height: number }) {
  return (
    <div
      style={{ height }}
      className="w-full rounded-xl bg-slate-50 flex items-center gap-[2px] px-2 overflow-hidden"
    >
      {SKELETON_HEIGHTS.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-full bg-slate-200 animate-pulse"
          style={{ height: `${h}%`, animationDelay: `${(i % 12) * 60}ms` }}
        />
      ))}
    </div>
  );
}

// ─── Error fallback ───────────────────────────────────────────────────────────

function ErrorFallback({
  height,
  progress,
  onSeek,
  containerRef,
}: {
  height: number;
  progress: number;
  onSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={containerRef}
      style={{ height }}
      className="w-full rounded-xl bg-slate-50 flex flex-col items-stretch justify-center gap-2 px-3 cursor-pointer"
      onClick={onSeek}
      title="Click to seek"
    >
      {/* Simple scrubber bar */}
      <div className="relative h-1.5 rounded-full bg-slate-200">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-slate-700"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="flex items-center gap-1.5 justify-center text-[10px] text-slate-400 select-none">
        <Radio className="w-2.5 h-2.5" />
        Waveform unavailable — click to seek
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AudioWaveform({
  audioUrl,
  currentTime,
  duration,
  onSeek,
  markers = [],
  height = 64,
  className = '',
}: AudioWaveformProps) {
  const canvasRef    = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Store peaks in a ref so the draw effect doesn't trigger on every re-render
  const peaksRef     = useRef<Float32Array | null>(null);
  const urlRef       = useRef('');

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // ── Load + decode ──
  useEffect(() => {
    if (!audioUrl || audioUrl === urlRef.current) return;
    urlRef.current = audioUrl;

    let cancelled = false;
    setStatus('loading');
    peaksRef.current = null;

    (async () => {
      try {
        const buf   = await fetchAudioForWaveform(audioUrl);
        if (cancelled) return;
        const peaks = await decodeWaveform(buf);
        if (cancelled) return;
        peaksRef.current = peaks;
        setStatus('ready');
      } catch (err) {
        if (!cancelled) {
          console.warn('[AudioWaveform] decode failed:', err);
          setStatus('error');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [audioUrl]);

  // ── Redraw whenever playback or markers change ──
  useEffect(() => {
    if (status !== 'ready' || !canvasRef.current || !peaksRef.current) return;
    const progress = duration > 0 ? currentTime / duration : 0;
    drawCanvas(canvasRef.current, peaksRef.current, progress, markers, duration);
  }, [status, currentTime, duration, markers]);

  // ── Redraw on container resize ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => {
      if (status === 'ready' && canvasRef.current && peaksRef.current) {
        const progress = duration > 0 ? currentTime / duration : 0;
        drawCanvas(canvasRef.current, peaksRef.current, progress, markers, duration);
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [status, currentTime, duration, markers]);

  // ── Seek on click ──
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = containerRef.current;
      if (!el || !duration) return;
      const rect = el.getBoundingClientRect();
      const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onSeek(pct * duration);
    },
    [duration, onSeek],
  );

  const progress = duration > 0 ? currentTime / duration : 0;

  if (status === 'loading') {
    return <LoadingSkeleton height={height} />;
  }

  if (status === 'error') {
    return (
      <ErrorFallback
        height={height}
        progress={progress}
        onSeek={handleClick as any}
        containerRef={containerRef}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className={`w-full rounded-xl bg-slate-50 cursor-pointer select-none overflow-hidden${className ? ` ${className}` : ''}`}
      onClick={handleClick}
      title="Click to seek"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
