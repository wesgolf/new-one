import { motion } from 'motion/react';
import { Play, Radio } from 'lucide-react';

interface RadioShowProps {
  soundcloudUrl: string;
  artistName: string;
}

const MIXES = [
  { id: '1', title: 'Late Night Session Vol. 1',  duration: '1h 02m', genre: 'Electronic / House'      },
  { id: '2', title: 'Festival Warmup Mix 2024',    duration: '47m',    genre: 'Progressive / Trance'   },
  { id: '3', title: 'Underground Frequencies',     duration: '55m',    genre: 'Tech House / Minimal'   },
];

export default function RadioShow({ soundcloudUrl, artistName }: RadioShowProps) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.36em] text-white/25">
        Radio
      </p>
      <h2 className="mb-6 text-3xl font-black tracking-tight text-white">
        {artistName.split(' ')[0]} Radio
      </h2>

      {/* Show card */}
      <motion.div
        className="relative overflow-hidden rounded-2xl border border-white/8 p-6 sm:p-7"
        style={{ background: 'linear-gradient(135deg, #111111 0%, #0d0d0d 100%)' }}
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Decorative glow */}
        <div
          className="absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-5 blur-3xl"
          style={{ background: '#ffffff' }}
        />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Radio className="h-4 w-4 text-white/40" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                Mix Series
              </span>
            </div>
            <h3 className="text-xl font-black text-white">
              {artistName.split(' ')[0]} Radio
            </h3>
            <p className="mt-1 text-xs text-white/35">
              Monthly mixes &amp; live sets
            </p>
          </div>
          {soundcloudUrl && (
            <a
              href={soundcloudUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-black hover:scale-105 transition-transform duration-200 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              <Play className="h-4 w-4 ml-0.5" />
            </a>
          )}
        </div>

        {/* Recent mixes */}
        <div className="mt-6 space-y-2.5">
          {MIXES.map((mix, i) => (
            <motion.a
              key={mix.id}
              href={soundcloudUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5 group"
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.07 }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/8 text-white/25 group-hover:text-white/60 transition-colors">
                  <Play className="h-3 w-3 ml-0.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white/70 group-hover:text-white transition-colors">
                    {mix.title}
                  </p>
                  <p className="text-[10px] text-white/25">{mix.genre}</p>
                </div>
              </div>
              <span className="text-[10px] tabular-nums text-white/25 shrink-0">{mix.duration}</span>
            </motion.a>
          ))}
        </div>

        {soundcloudUrl && (
          <div className="mt-5 pt-5 border-t border-white/8">
            <a
              href={soundcloudUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/30 hover:text-white/70 transition-colors"
            >
              All Mixes on SoundCloud →
            </a>
          </div>
        )}
      </motion.div>
    </div>
  );
}
