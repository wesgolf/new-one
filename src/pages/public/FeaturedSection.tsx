import { motion } from 'motion/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faVideo } from '@fortawesome/free-solid-svg-icons';
import { faSpotify, faApple, faSoundcloud } from '@fortawesome/free-brands-svg-icons';
import type { ReleaseRecord } from '../../types/domain';

interface FeaturedSectionProps {
  release: ReleaseRecord | null;
  spotifyUrl:    string;
  appleMusicUrl: string;
  soundcloudUrl: string;
  instagramUrl:  string;
}

export default function FeaturedSection({
  release,
  spotifyUrl,
  appleMusicUrl,
  soundcloudUrl,
  instagramUrl,
}: FeaturedSectionProps) {
  const ARTWORK_FALLBACK = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAwkzItrY6j5QJ9O_Qw5my1E9s1PKxM45Gd6bwa8qDuaE-dMA5FrxzfDQ91zh2ku_5bDDi_0DPyv7zPMk6aDj3wZflNgdu02Q2cMhhnE44XohcEJ4rM2zvHhmR4yWwf7yAVZQIK38YrLflwl80mfakfY0wE7rDO8qfeHd_QwPpGNnjJ47BoQZvpHQN6jWP7plc8sjHx80OCe-en-Uj6PWF4NqPPv93SZjr88NINaETIT2pQn6X5MQwTw_NroGiN30PT9Jlax962P34';

  const artwork  = release?.cover_art_url || ARTWORK_FALLBACK;
  const title    = release?.title         || 'Neon Horizon';

  const streamingIcons = [
    { icon: faSpotify,    url: spotifyUrl    || 'https://open.spotify.com/artist/2tMGlOELT6IvxS5xZItMk3', label: 'Spotify'    },
    { icon: faApple,      url: appleMusicUrl || 'https://music.apple.com/ca/artist/wesley-robertson/1680235876', label: 'Apple' },
    { icon: faSoundcloud, url: soundcloudUrl || 'https://soundcloud.com/wesmusic1',                           label: 'SoundCloud' },
  ];

  const secondaryCards = [
    {
      type: 'radio',
      title: 'Latest Radio Mix',
      subtitle: 'Wes Radio #042',
      cta: 'Listen Now',
      icon: faPlay,
      colorClass: 'bg-secondary',
      href: '#radio',
    },
    {
      type: 'reel',
      title: 'Watch Latest Reel',
      subtitle: 'Behind the scenes at Red Rocks',
      cta: 'Watch Now',
      icon: faVideo,
      colorClass: 'bg-primary',
      href: instagramUrl || 'https://instagram.com/musicbywes_',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Main release card ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-surface-container-low rounded-3xl overflow-hidden border border-outline/5 shadow-xl flex flex-col sm:flex-row items-center sm:items-stretch"
      >
        {/* Cover art */}
        <div className="w-full sm:w-48 aspect-square relative group overflow-hidden shrink-0">
          <img
            src={artwork}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-on-primary shadow-xl"
            >
              <FontAwesomeIcon icon={faPlay} className="text-lg ml-1" />
            </motion.div>
          </div>
        </div>

        {/* Info */}
        <div className="p-6 flex-1 flex flex-col justify-center text-center sm:text-left space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest rounded-full border border-primary/20">
                New Release
              </span>
            </div>
            <h2 className="font-headline text-2xl font-black tracking-tighter text-on-surface">
              {title}
            </h2>
            <p className="text-[10px] font-medium text-on-surface/40 uppercase tracking-widest">
              Out now on all platforms
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <motion.a
              href={spotifyUrl || 'https://open.spotify.com/artist/2tMGlOELT6IvxS5xZItMk3'}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-3 bg-primary text-on-primary text-xs font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
            >
              Stream Now
            </motion.a>

            <div className="flex gap-2">
              {streamingIcons.map(p => (
                <motion.a
                  key={p.label}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ y: -2 }}
                  aria-label={p.label}
                  className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface/60 hover:text-primary transition-colors border border-outline/5"
                >
                  <FontAwesomeIcon icon={p.icon} className="text-base" />
                </motion.a>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Secondary cards ── */}
      <div className="grid gap-3">
        {secondaryCards.map((card, index) => (
          <motion.a
            key={card.title}
            href={card.href}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl border border-outline/5 shadow-lg group"
          >
            <div className={`w-10 h-10 ${card.colorClass} rounded-xl flex items-center justify-center text-on-primary shadow-md shrink-0`}>
              <FontAwesomeIcon icon={card.icon} className="text-base" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-headline text-sm font-black tracking-tight text-on-surface truncate">
                {card.title}
              </h3>
              <p className="text-[9px] text-on-surface/40 font-medium truncate uppercase tracking-widest">
                {card.subtitle}
              </p>
            </div>
            <div className="text-[8px] font-black uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              {card.cta}
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  );
}
