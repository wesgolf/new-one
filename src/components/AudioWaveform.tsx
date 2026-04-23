import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Radio, RefreshCw } from 'lucide-react';

const MARKER_HIT = 10;
let audioProxyAvailable = true;

export interface WaveformMarker {
  id: string;
  time: number;
  label?: string;
  color?: string;
}

export interface WaveformSection {
  label: string;
  startFrac: number;
  endFrac: number;
  color: string;
}

interface AudioWaveformProps {
  audioUrl: string;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  markers?: WaveformMarker[];
  onMarkerAdd?: (time: number) => void;
  onMarkerMove?: (markerId: string, newTime: number) => void;
  addMarkerMode?: boolean;
  autoSections?: boolean;
  onSectionsDetected?: (sections: WaveformSection[]) => void;
  height?: number;
  className?: string;
}

export function detectSections(peaks: Float32Array): WaveformSection[] {
  const n = peaks.length;
  const win = Math.max(3, Math.floor(n / 24));

  const smooth = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - win); j <= Math.min(n - 1, i + win); j++) {
      sum += peaks[j];
      count++;
    }
    smooth[i] = sum / Math.max(1, count);
  }

  let maxEnergy = 0;
  for (let i = 0; i < smooth.length; i++) {
    if (smooth[i] > maxEnergy) maxEnergy = smooth[i];
  }
  const scale = maxEnergy > 0 ? maxEnergy : 1;

  const levels = Array.from(smooth, (v) => {
    const normalized = v / scale;
    if (normalized > 0.65) return 2;
    if (normalized < 0.3) return 0;
    return 1;
  });

  const names = ['Verse', 'Build', 'Chorus'];
  const colors = ['rgba(59,130,246,0.10)', 'rgba(249,115,22,0.10)', 'rgba(34,197,94,0.10)'];

  const sections: WaveformSection[] = [];
  let start = 0;
  let level = levels[0] ?? 1;

  for (let i = 1; i <= n; i++) {
    if (i === n || levels[i] !== level) {
      sections.push({
        label: names[level],
        startFrac: start / Math.max(1, n),
        endFrac: i / Math.max(1, n),
        color: colors[level],
      });
      if (i < n) {
        start = i;
        level = levels[i];
      }
    }
  }

  if (sections.length > 0 && sections[0].endFrac <= 0.18) {
    sections[0] = { ...sections[0], label: 'Intro', color: 'rgba(99,102,241,0.10)' };
  }
  const last = sections[sections.length - 1];
  if (last && last.startFrac >= 0.82) {
    sections[sections.length - 1] = { ...last, label: 'Outro', color: 'rgba(100,116,139,0.10)' };
  }

  const merged: WaveformSection[] = [];
  for (const section of sections) {
    if (section.endFrac - section.startFrac < 0.04 && merged.length > 0) {
      merged[merged.length - 1] = { ...merged[merged.length - 1], endFrac: section.endFrac };
    } else {
      merged.push(section);
    }
  }

  return merged;
}

function downsamplePeaks(channelData: Float32Array, bars = 220): Float32Array {
  const blockSize = Math.max(1, Math.floor(channelData.length / bars));
  const out = new Float32Array(bars);

  for (let i = 0; i < bars; i++) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, channelData.length);
    let sum = 0;
    for (let j = start; j < end; j++) {
      const s = channelData[j];
      sum += s * s;
    }
    out[i] = Math.sqrt(sum / Math.max(1, end - start));
  }

  let max = 0;
  for (let i = 0; i < out.length; i++) {
    if (out[i] > max) max = out[i];
  }
  if (max > 0) {
    for (let i = 0; i < out.length; i++) out[i] /= max;
  }

  return out;
}

async function fetchAudioBuffer(url: string): Promise<{ data: ArrayBuffer; mimeType: string }> {
  if (audioProxyAvailable) {
    try {
      const proxied = await fetch(`/api/audio-proxy?url=${encodeURIComponent(url)}`);
      if (proxied.ok) {
        return {
          data: await proxied.arrayBuffer(),
          mimeType: proxied.headers.get('content-type') || 'audio/mpeg',
        };
      }
      if (proxied.status === 404) {
        audioProxyAvailable = false;
        console.warn('[AudioWaveform] /api/audio-proxy unavailable; using direct fetch fallback for this session.');
      }
    } catch {
      audioProxyAvailable = false;
    }
  }

  const direct = await fetch(url, { mode: 'cors', credentials: 'omit' });
  if (!direct.ok) {
    throw new Error(`HTTP ${direct.status} ${direct.statusText}`);
  }

  return {
    data: await direct.arrayBuffer(),
    mimeType: direct.headers.get('content-type') || 'audio/mpeg',
  };
}

const SKELETON_HEIGHTS = Array.from({ length: 60 }, (_, i) => 20 + 70 * Math.abs(Math.sin(i * 0.55 + 0.3)));

function LoadingSkeleton({ height }: { height: number }) {
  return (
    <div style={{ height }} className="w-full rounded-xl bg-slate-50 flex items-center gap-[2px] px-2 overflow-hidden">
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

function ErrorFallback({
  height,
  progress,
  onSeek,
  onRetry,
  containerRef,
}: {
  height: number;
  progress: number;
  onSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
  onRetry: () => void;
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
      <div className="relative h-1.5 rounded-full bg-slate-200">
        <div className="absolute left-0 top-0 h-full rounded-full bg-slate-700" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="flex items-center gap-2 justify-center text-[10px] text-slate-400 select-none">
        <Radio className="w-2.5 h-2.5 shrink-0" />
        <span>Waveform unavailable - click to seek</span>
        <span>-</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRetry();
          }}
          className="flex items-center gap-1 underline hover:text-slate-600 transition-colors"
        >
          <RefreshCw className="w-2.5 h-2.5" />
          Retry
        </button>
      </div>
    </div>
  );
}

export function AudioWaveform({
  audioUrl,
  currentTime,
  duration,
  onSeek,
  markers = [],
  onMarkerAdd,
  onMarkerMove,
  addMarkerMode = false,
  autoSections = false,
  onSectionsDetected,
  height = 64,
  className = '',
}: AudioWaveformProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const waveRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [sections, setSections] = useState<WaveformSection[]>([]);
  const [internalDuration, setInternalDuration] = useState(0);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingFrac, setDraggingFrac] = useState<number | null>(null);

  const dragMovedRef = useRef(false);
  const effectiveDuration = duration > 0 ? duration : internalDuration;

  const effectiveMarkers = useMemo(() => {
    if (!draggingId || draggingFrac == null || effectiveDuration <= 0) return markers;
    return markers.map((m) => (m.id === draggingId ? { ...m, time: draggingFrac * effectiveDuration } : m));
  }, [markers, draggingId, draggingFrac, effectiveDuration]);

  const markerLabelVisibility = useMemo(() => {
    if (effectiveDuration <= 0) return new Set<string>();

    const sorted = [...effectiveMarkers].sort((a, b) => a.time - b.time);
    const visible = new Set<string>();
    let lastLabelPct = -100;

    for (const marker of sorted) {
      if (!marker.label) continue;
      const pct = (marker.time / effectiveDuration) * 100;
      // Require spacing between labels to avoid collisions.
      if (pct - lastLabelPct >= 9) {
        visible.add(marker.id);
        lastLabelPct = pct;
      }
    }

    return visible;
  }, [effectiveMarkers, effectiveDuration]);

  useEffect(() => {
    if (!audioUrl || !waveRef.current) return;

    let cancelled = false;
    setStatus('loading');
    setSections([]);

    const destroyCurrent = () => {
      if (wsRef.current) {
        wsRef.current.destroy();
        wsRef.current = null;
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };

    destroyCurrent();

    const ws = WaveSurfer.create({
      container: waveRef.current,
      height,
      normalize: true,
      interact: false,
      waveColor: '#cfd8e4',
      progressColor: '#2f67d8',
      cursorColor: '#1e40af',
      cursorWidth: 1,
      barWidth: 2.5,
      barGap: 1.5,
      barRadius: 3,
    });

    wsRef.current = ws;

    ws.on('ready', () => {
      if (cancelled) return;
      const d = ws.getDuration() || 0;
      setInternalDuration(d);
      setStatus('ready');

      if (autoSections) {
        const decoded = ws.getDecodedData();
        if (decoded) {
          const channel = decoded.getChannelData(0);
          const peaks = downsamplePeaks(channel);
          const detected = detectSections(peaks);
          setSections(detected);
          onSectionsDetected?.(detected);
        }
      }
    });

    ws.on('error', (err) => {
      if (cancelled) return;
      console.warn('[AudioWaveform] wavesurfer error:', err);
      setStatus('error');
    });

    (async () => {
      try {
        const { data, mimeType } = await fetchAudioBuffer(audioUrl);
        if (cancelled) return;
        const blob = new Blob([data], { type: mimeType });
        const objectUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objectUrl;
        ws.load(objectUrl);
      } catch (err) {
        if (!cancelled) {
          console.warn('[AudioWaveform] load failed:', err);
          setStatus('error');
        }
      }
    })();

    return () => {
      cancelled = true;
      destroyCurrent();
    };
  }, [audioUrl, autoSections, onSectionsDetected, reloadKey, height]);

  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || status !== 'ready' || effectiveDuration <= 0) return;

    const frac = Math.max(0, Math.min(1, currentTime / effectiveDuration));
    ws.seekTo(frac);
  }, [currentTime, effectiveDuration, status]);

  const getMarkerAt = useCallback(
    (clientX: number): WaveformMarker | null => {
      const el = hostRef.current;
      if (!el || !effectiveDuration) return null;
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      const width = rect.width;
      for (const marker of effectiveMarkers) {
        const markerX = (marker.time / effectiveDuration) * width;
        if (Math.abs(markerX - x) <= MARKER_HIT) return marker;
      }
      return null;
    },
    [effectiveDuration, effectiveMarkers],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onMarkerMove || status !== 'ready') return;
      const marker = getMarkerAt(e.clientX);
      if (!marker) return;

      e.preventDefault();
      dragMovedRef.current = false;
      setDraggingId(marker.id);
      setDraggingFrac(marker.time / Math.max(0.001, effectiveDuration));
    },
    [effectiveDuration, getMarkerAt, onMarkerMove, status],
  );

  useEffect(() => {
    if (!draggingId || !onMarkerMove) return;

    const move = (e: MouseEvent) => {
      const el = hostRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
      dragMovedRef.current = true;
      setDraggingFrac(frac);
    };

    const up = (e: MouseEvent) => {
      const el = hostRef.current;
      if (el && effectiveDuration > 0) {
        const rect = el.getBoundingClientRect();
        const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
        onMarkerMove(draggingId, frac * effectiveDuration);
      }
      setDraggingId(null);
      setDraggingFrac(null);
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [draggingId, effectiveDuration, onMarkerMove]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (status !== 'ready') return;
      if (dragMovedRef.current) {
        dragMovedRef.current = false;
        return;
      }

      const el = hostRef.current;
      if (!el || effectiveDuration <= 0) return;
      const rect = el.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));

      const hit = getMarkerAt(e.clientX);
      if (hit) {
        onSeek(hit.time);
        return;
      }

      if (addMarkerMode && onMarkerAdd) {
        onMarkerAdd(frac * effectiveDuration);
        return;
      }

      onSeek(frac * effectiveDuration);
    },
    [addMarkerMode, effectiveDuration, getMarkerAt, onMarkerAdd, onSeek, status],
  );

  const progress = effectiveDuration > 0 ? currentTime / effectiveDuration : 0;

  return (
    <div className={className}>
      {status === 'loading' && <LoadingSkeleton height={height} />}

      {status === 'error' && (
        <ErrorFallback
          height={height}
          progress={progress}
          onSeek={handleClick}
          onRetry={() => setReloadKey((k) => k + 1)}
          containerRef={hostRef}
        />
      )}

      <div
        ref={hostRef}
        className={status === 'ready' ? 'relative w-full rounded-xl overflow-hidden cursor-pointer bg-[#f5f7fb]' : 'hidden'}
        style={{ height }}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
      >
        <div ref={waveRef} className="absolute inset-0" />

        {sections.length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            {sections.map((section, i) => (
              <div
                key={`${section.label}-${i}`}
                className="absolute top-0 h-full"
                style={{
                  left: `${section.startFrac * 100}%`,
                  width: `${(section.endFrac - section.startFrac) * 100}%`,
                  background: section.color,
                }}
              >
                {section.endFrac - section.startFrac >= 0.12 && (
                  <span className="absolute left-1.5 top-1 rounded bg-white/55 px-1.5 py-[1px] text-[9px] font-bold tracking-wide text-slate-500/85 uppercase backdrop-blur-sm">
                    {section.label}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {effectiveDuration > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            {effectiveMarkers.map((marker) => {
              const left = (marker.time / effectiveDuration) * 100;
              const color = marker.color ?? '#f59e0b';
              const showLabel = markerLabelVisibility.has(marker.id);
              return (
                <div key={marker.id} className="absolute top-0 bottom-0" style={{ left: `${left}%` }}>
                  <div
                    className="absolute top-0 -translate-x-1/2"
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: '4px solid transparent',
                      borderRight: '4px solid transparent',
                      borderTop: `9px solid ${color}`,
                    }}
                  />
                  <div className="absolute top-2 bottom-0 -translate-x-1/2 w-[1.5px] opacity-85" style={{ backgroundColor: color }} />
                  {marker.label && showLabel && (
                    <span
                      className="absolute top-[2px] left-2 rounded bg-white/75 px-1 py-[1px] text-[9px] font-bold leading-none whitespace-nowrap backdrop-blur-sm"
                      style={{ color }}
                    >
                      {marker.label.slice(0, 10)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
