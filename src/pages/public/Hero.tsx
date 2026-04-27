import { motion } from 'motion/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faInstagram,
  faSpotify,
  faApple,
  faSoundcloud,
  faTiktok,
  faYoutube,
} from '@fortawesome/free-brands-svg-icons';

interface HeroProps {
  imageUrl: string;
  spotifyUrl:    string;
  appleMusicUrl: string;
  soundcloudUrl: string;
  instagramUrl:  string;
  tiktokUrl:     string;
  youtubeUrl:    string;
}

export default function Hero({
  imageUrl,
  spotifyUrl,
  appleMusicUrl,
  soundcloudUrl,
  instagramUrl,
  tiktokUrl,
  youtubeUrl,
}: HeroProps) {
  const socialLinks = [
    { icon: faInstagram, url: instagramUrl, label: 'Instagram' },
    { icon: faSpotify, url: spotifyUrl, label: 'Spotify' },
    { icon: faApple, url: appleMusicUrl, label: 'Apple Music' },
    { icon: faSoundcloud, url: soundcloudUrl, label: 'SoundCloud' },
    { icon: faTiktok, url: tiktokUrl, label: 'TikTok' },
    { icon: faYoutube, url: youtubeUrl, label: 'YouTube' },
  ].filter((link) => Boolean(link.url));

  return (
    <header className="relative space-y-10 pt-8 pb-8 text-center sm:pt-10">
      {/* Portrait with radial fade mask */}
      <div className="relative mb-6 flex justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative aspect-square w-full max-w-[24rem] sm:max-w-[28rem]"
        >
          <div
            className="absolute inset-0 z-0"
            style={{
              maskImage: 'radial-gradient(circle, black 50%, transparent 90%)',
              WebkitMaskImage: 'radial-gradient(circle, black 50%, transparent 90%)',
            }}
          >
            <img
              src={imageUrl}
              alt="Wes Artist"
              className="w-full h-full object-cover rounded-3xl"
              referrerPolicy="no-referrer"
            />
          </div>
        </motion.div>
      </div>

      {/* Social links */}
      <div className="flex flex-col items-center space-y-6">
        <div className="flex flex-wrap justify-center gap-6 py-2">
          {socialLinks.map((link, index) => (
            <motion.a
              key={link.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.label}
              className="text-white/45 transition-colors hover:text-white"
            >
              <FontAwesomeIcon icon={link.icon} className="text-xl" />
            </motion.a>
          ))}
        </div>
      </div>
    </header>
  );
}
