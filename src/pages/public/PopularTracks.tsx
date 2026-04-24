import { motion } from 'motion/react';
import type { ReleaseRecord } from '../../types/domain';

interface Track {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string;
  url?: string;
}

interface PopularTracksProps {
  releases: ReleaseRecord[];
  featuredTracks: { title: string; url: string; streams: string }[];
  artistName: string;
  streamingLinks: { label: string; Icon: React.FC<{ className?: string }>; href: string }[];
}

function SpotifyMini({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

export default function PopularTracks({ releases, featuredTracks, artistName, streamingLinks }: PopularTracksProps) {
  const tracks: Track[] = featuredTracks.length > 0
    ? featuredTracks.map((t, i) => ({
        id: String(i),
        title: t.title,
        artist: artistName,
        coverUrl: releases[0]?.cover_art_url,
        url: t.url,
      }))
    : releases.slice(0, 6).map(r => ({
        id: r.id,
        title: r.title,
        artist: artistName,
        coverUrl: r.cover_art_url ?? undefined,
        url: '',
      }));

  if (tracks.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.36em] text-white/25">
        Catalog
      </p>
      <h2 className="mb-6 text-3xl font-black tracking-tight text-white">
        Popular Tracks
      </h2>

      {/* Numbered track list */}
      <div className="space-y-1">
        {tracks.map((track, i) => (
          <motion.div
            key={track.id}
            className="group flex items-center gap-4 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5 cursor-pointer"
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: i * 0.04 }}
          >
            {/* Number / play indicator */}
            <span className="w-5 text-center text-sm font-black tabular-nums text-white/20 group-hover:text-white/40 shrink-0">
              {i + 1}
            </span>

            {/* Cover */}
            <div
              className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/8"
              style={{ background: '#1a1a1a' }}
            >
              {track.coverUrl && (
                <img
                  src={track.coverUrl}
                  alt={track.title}
                  className="h-full w-full object-cover"
                />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white/80 group-hover:text-white transition-colors truncate">
                {track.title}
              </p>
              <p className="text-xs text-white/28 truncate">{track.artist}</p>
            </div>

            {/* Stream icon */}
            {track.url ? (
              <a
                href={track.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-white/20 hover:text-white/70 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
              >
                <SpotifyMini className="h-4 w-4" />
              </a>
            ) : (
              <a
                href={streamingLinks[0]?.href ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-white/20 hover:text-white/70 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
              >
                <SpotifyMini className="h-4 w-4" />
              </a>
            )}
          </motion.div>
        ))}
      </div>

      {/* View all CTA */}
      {streamingLinks[0] && (() => {
        const PrimaryIcon = streamingLinks[0].Icon;
        return (
          <motion.div
            className="mt-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <a
              href={streamingLinks[0].href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white/50 hover:border-white/40 hover:text-white transition-all duration-200"
            >
              <PrimaryIcon className="h-3.5 w-3.5" />
              Listen on {streamingLinks[0].label}
            </a>
          </motion.div>
        );
      })()}
    </div>
  );
}
