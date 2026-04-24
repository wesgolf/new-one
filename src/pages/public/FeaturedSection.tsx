import { motion } from 'motion/react';
import type { ReleaseRecord } from '../../types/domain';

interface FeaturedSectionProps {
  release: ReleaseRecord | null;
  streamingLinks: { label: string; Icon: React.FC<{ className?: string }>; href: string }[];
}

export default function FeaturedSection({ release, streamingLinks }: FeaturedSectionProps) {
  return (
    <div>
      <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.36em] text-white/25">
        Featured
      </p>

      <motion.div
        className="group relative overflow-hidden rounded-2xl border border-white/8"
        style={{ background: '#111111' }}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex">
          {/* Cover art — 38% */}
          <div className="w-[38%] shrink-0 self-stretch overflow-hidden">
            {release?.cover_art_url ? (
              <img
                src={release.cover_art_url}
                alt={release.title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div
                className="h-full w-full min-h-[160px]"
                style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)' }}
              />
            )}
          </div>

          {/* Info — 62% */}
          <div className="flex flex-1 flex-col justify-between p-5 sm:p-7 border-l border-white/8">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.30em] text-white/22 mb-2">
                Latest Release
              </p>
              <h2 className="text-[clamp(20px,4vw,36px)] font-black leading-tight tracking-tight text-white">
                {release?.title ?? 'New Music'}
              </h2>
              {release?.release_date && (
                <p className="mt-1.5 text-xs text-white/30">
                  {new Date(release.release_date).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>
              )}
              {release?.description && (
                <p className="mt-3 text-[12px] leading-relaxed text-white/40 line-clamp-3">
                  {release.description}
                </p>
              )}
            </div>

            {/* Stream buttons */}
            <div className="mt-5 flex items-center gap-4 flex-wrap">
              {streamingLinks.map(({ label, Icon, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex items-center gap-1.5 text-white/30 hover:text-white/80 transition-all duration-200 text-[11px] font-bold hover:scale-105"
                >
                  <Icon className="h-[14px] w-[14px]" />
                  <span className="hidden sm:inline">{label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
