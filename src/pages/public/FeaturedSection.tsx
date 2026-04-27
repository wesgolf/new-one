import { motion } from 'motion/react';
import { Disc3, Music2, Radio, Video } from 'lucide-react';
import type { ReleaseRecord } from '../../types/domain';

interface FeaturedSectionProps {
  release: ReleaseRecord | null;
  spotifyUrl?: string | null;
  appleMusicUrl?: string | null;
  youtubeUrl?: string | null;
  soundcloudUrl?: string | null;
}

export default function FeaturedSection({
  release,
  spotifyUrl,
  appleMusicUrl,
  youtubeUrl,
  soundcloudUrl,
}: FeaturedSectionProps) {
  const ARTWORK_FALLBACK = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAwkzItrY6j5QJ9O_Qw5my1E9s1PKxM45Gd6bwa8qDuaE-dMA5FrxzfDQ91zh2ku_5bDDi_0DPyv7zPMk6aDj3wZflNgdu02Q2cMhhnE44XohcEJ4rM2zvHhmR4yWwf7yAVZQIK38YrLflwl80mfakfY0wE7rDO8qfeHd_QwPpGNnjJ47BoQZvpHQN6jWP7plc8sjHx80OCe-en-Uj6PWF4NqPPv93SZjr88NINaETIT2pQn6X5MQwTw_NroGiN30PT9Jlax962P34';
  const artwork = release?.cover_art_url || ARTWORK_FALLBACK;
  const title = release?.title || 'No featured release';
  const totalStreams =
    Number(release?.performance?.streams?.spotify ?? 0) +
    Number(release?.performance?.streams?.apple ?? 0) +
    Number(release?.performance?.streams?.soundcloud ?? 0) +
    Number(release?.performance?.streams?.youtube ?? 0);
  const releaseDate = release?.release_date
    ? new Date(release.release_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;
  const platformLinks = [
    { label: 'Play on Apple Music', href: appleMusicUrl, Icon: Music2 },
    { label: 'Play on Spotify', href: spotifyUrl, Icon: Disc3 },
    { label: 'Play on YouTube', href: youtubeUrl, Icon: Video },
    { label: 'Play on SoundCloud', href: soundcloudUrl, Icon: Radio },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
      >
        <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
          <div className="relative aspect-square overflow-hidden lg:aspect-auto">
            <img
              src={artwork}
              alt={title}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute left-5 top-5 rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-white/70 backdrop-blur-sm">
              Featured Release
            </div>
          </div>

          <div className="flex flex-col justify-between gap-8 p-6 sm:p-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                  {title}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
                  {releaseDate && <span>{releaseDate}</span>}
                  {totalStreams > 0 && (
                    <span>{new Intl.NumberFormat('en-US').format(totalStreams)} total streams</span>
                  )}
                </div>
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-white/55">
                {release?.notes?.trim() || 'Your featured release defaults to the latest track, and can be switched from Settings whenever you want to spotlight something else.'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {platformLinks.map(({ label, href, Icon }) => (
                href ? (
                  <motion.a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.99 }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-white/80 transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </motion.a>
                ) : (
                  <div
                    key={label}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/[0.025] px-4 py-3 text-sm font-semibold text-white/25"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
