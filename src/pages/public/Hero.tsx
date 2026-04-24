import { motion } from 'motion/react';

interface HeroProps {
  imageUrl: string;
  artistName: string;
  subtitle: string;
  socials: { id: string; label: string; Icon: React.FC<{ className?: string }>; href: string }[];
  streamingLinks: { label: string; Icon: React.FC<{ className?: string }>; href: string }[];
}

export default function Hero({ imageUrl, artistName, subtitle, socials, streamingLinks }: HeroProps) {
  return (
    <div className="relative pt-32 pb-12">
      {/* Portrait */}
      <motion.div
        className="relative w-full overflow-hidden rounded-2xl"
        style={{ aspectRatio: '4/5', maxHeight: '70vh' }}
        initial={{ opacity: 0, scale: 1.03 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <img
          src={imageUrl}
          alt={artistName}
          className="h-full w-full object-cover object-center"
        />
        {/* Bottom fade */}
        <div
          className="absolute inset-x-0 bottom-0 h-48 pointer-events-none"
          style={{ background: 'linear-gradient(to top, #050505 0%, transparent 100%)' }}
        />
      </motion.div>

      {/* Artist info */}
      <motion.div
        className="mt-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-white/30 mb-3">
          {subtitle}
        </p>
        <h1 className="text-[clamp(52px,14vw,96px)] font-black leading-[0.88] tracking-tight text-white">
          {artistName.split(' ')[0].toUpperCase()}.
        </h1>
      </motion.div>

      {/* Streaming platform icons */}
      <motion.div
        className="mt-6 flex items-center gap-5 flex-wrap"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        {streamingLinks.map(({ label, Icon, href }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="text-white/25 hover:text-white/80 transition-all duration-200 hover:scale-110"
          >
            <Icon className="h-5 w-5" />
          </a>
        ))}
      </motion.div>

      {/* Social icons */}
      {socials.length > 0 && (
        <motion.div
          className="mt-4 flex items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          {socials.map(({ id, label, Icon, href }) => (
            <a
              key={id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="text-white/20 hover:text-white/60 transition-all duration-200 hover:scale-110"
            >
              <Icon className="h-[17px] w-[17px]" />
            </a>
          ))}
        </motion.div>
      )}
    </div>
  );
}
