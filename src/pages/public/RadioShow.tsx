import { motion } from 'motion/react';
import { Play, Radio, Video } from 'lucide-react';
import type { ReleaseRecord } from '../../types/domain';

const RADIO_IMAGE = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAqdWzLSx6CLpmKgbzaFfy-WZnFMQiyL_X7YmHx8wnM6Z2cEpuqz1aFI0MA1Wsh_v4Qjamu28Iamh0b0G6z_ChK_8Z-L0xIWSLjT8zQ_uT3IB4uEBTzQMPvn9gomE2TRH2dttEt-VnDhnQ4IkKTbEyf9KTNds7tQOC_011jwHbl1LuHgtiXGaVYYW7ctpoBFVT2hqgv6U53Vcg59MgzaCGUg9lyfNLuVDIfb9oQCD5gsKYaNFPR1jn1hWO4jdxSNuRGcMFyAPRHieU';

interface RadioShowProps {
  release: ReleaseRecord | null;
  soundcloudUrl?: string | null;
  youtubeUrl?: string | null;
}

export default function RadioShow({ release, soundcloudUrl, youtubeUrl }: RadioShowProps) {
  const title = release?.title ?? 'No radio mix selected';
  const artwork = release?.cover_art_url || RADIO_IMAGE;
  const releaseDate = release?.release_date
    ? new Date(release.release_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <section className="space-y-8">
      <div className="flex items-end justify-between gap-4 px-1">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Latest Radio Mix
          </h2>
          <p className="mt-2 text-sm text-white/40">
            Pulled from the most recent radio mix in your release catalog.
          </p>
        </div>
      </div>

      {!release ? (
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
          <p className="text-sm font-semibold text-white/65">No radio mix found.</p>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/25">
            Mark a release as a mix or include “radio” / “mix” in the title to surface it here
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
        >
          <div className="grid gap-0 lg:grid-cols-[minmax(240px,320px)_1fr]">
            <div className="relative aspect-[4/3] overflow-hidden lg:aspect-auto">
              <img
                alt={title}
                className="h-full w-full object-cover"
                src={artwork}
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-white/70 backdrop-blur-sm">
                <Radio className="h-3.5 w-3.5" />
                Radio Mix
              </div>
            </div>

            <div className="flex flex-col justify-between gap-6 p-5 sm:p-7">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
                  {releaseDate && <span>{releaseDate}</span>}
                  {release?.type && <span>{release.type}</span>}
                </div>
                <h3 className="text-2xl font-black leading-tight tracking-tight text-white sm:text-4xl">
                  {title}
                </h3>
                <p className="max-w-2xl text-sm leading-relaxed text-white/55">
                  {release.notes?.trim() || 'Open the latest radio mix directly from the public hub.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {soundcloudUrl && (
                  <a
                    href={soundcloudUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:border-white/20 hover:bg-white/[0.09] hover:text-white"
                  >
                    <Play className="h-4 w-4" />
                    Open on SoundCloud
                  </a>
                )}
                {youtubeUrl && (
                  <a
                    href={youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:border-white/20 hover:bg-white/[0.09] hover:text-white"
                  >
                    <Video className="h-4 w-4" />
                    Open on YouTube
                  </a>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </section>
  );
}
