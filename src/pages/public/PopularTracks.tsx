import { motion } from 'motion/react';
import { Disc3, ExternalLink, Music2, Radio, Video } from 'lucide-react';

export interface PublicTrack {
  id: string;
  title: string;
  totalStreams: number;
  spotifyUrl?: string | null;
  appleMusicUrl?: string | null;
  soundcloudUrl?: string | null;
  youtubeUrl?: string | null;
}

interface PopularTracksProps {
  tracks: PublicTrack[];
  loading?: boolean;
}

function formatStreams(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat('en-US').format(value);
}

export default function PopularTracks({ tracks, loading = false }: PopularTracksProps) {
  const columns = [tracks.slice(0, 4), tracks.slice(4, 8)].filter((group) => group.length > 0);

  return (
    <section className="space-y-8">
      <div className="flex items-end justify-between gap-4 px-1">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Popular Tracks
          </h2>
          <p className="mt-2 text-sm text-white/40">
            Top 8 tracks ranked by cumulative streams across Spotify, Apple Music, SoundCloud, and YouTube.
          </p>
        </div>
        <div className="hidden rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35 sm:inline-flex">
          Swipe for column two
        </div>
      </div>

      {loading ? (
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-3">
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[1.5rem] border border-white/8 bg-black/20 p-4"
              >
                <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
                <div className="mt-3 h-6 w-2/3 animate-pulse rounded bg-white/10" />
                <div className="mt-4 flex gap-2">
                  {Array.from({ length: 3 }).map((__, chipIndex) => (
                    <div key={chipIndex} className="h-8 w-24 animate-pulse rounded-full bg-white/10" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : tracks.length === 0 ? (
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
          <p className="text-sm font-semibold text-white/65">No released tracks with stream data yet.</p>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/25">
            Add performance stats to your releases to populate this section
          </p>
        </div>
      ) : (
        <>
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-2 md:overflow-visible">
            {columns.map((column, columnIndex) => (
              <div
                key={columnIndex}
                className="min-w-full snap-center rounded-[2rem] border border-white/10 bg-white/[0.03] p-3 md:min-w-0"
              >
                <div className="space-y-2">
                  {column.map((track, trackIndex) => {
                    const rank = columnIndex * 4 + trackIndex + 1;
                    const links = [
                      { label: 'Spotify', href: track.spotifyUrl, Icon: Disc3 },
                      { label: 'Apple', href: track.appleMusicUrl, Icon: Music2 },
                      { label: 'YouTube', href: track.youtubeUrl, Icon: Video },
                      { label: 'SoundCloud', href: track.soundcloudUrl, Icon: Radio },
                    ].filter((link) => Boolean(link.href));

                    return (
                      <motion.div
                        key={track.id}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: rank * 0.04 }}
                        className="rounded-[1.5rem] border border-white/8 bg-black/20 p-4"
                      >
                        <div className="min-w-0">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
                              #{rank}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                              {formatStreams(track.totalStreams)} streams
                            </span>
                          </div>
                          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-white sm:text-base">
                            {track.title}
                          </h3>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {links.map(({ label, href, Icon }) => (
                            <a
                              key={label}
                              href={href as string}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold text-white/70 transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {label}
                            </a>
                          ))}
                          {links.length === 0 && (
                            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-white/25">
                              <ExternalLink className="h-3.5 w-3.5" />
                              No streaming links
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {columns.length > 1 && (
            <div className="flex justify-center gap-2 md:hidden">
              {columns.map((_, index) => (
                <span key={index} className="h-1.5 w-8 rounded-full bg-white/15" />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
