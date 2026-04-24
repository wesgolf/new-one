import { motion } from "motion/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faInstagram, 
  faSpotify, 
  faApple, 
  faSoundcloud, 
  faTiktok, 
  faYoutube 
} from "@fortawesome/free-brands-svg-icons";

interface HeroProps {
  imageUrl: string;
}

export default function Hero({ imageUrl }: HeroProps) {
  const socialLinks = [
    { icon: faInstagram, url: "https://instagram.com/musicbywes_", label: "Instagram" },
    { icon: faSpotify, url: "https://open.spotify.com/artist/2tMGlOELT6IvxS5xZItMk3?si=hxNsrXX_RRiZ72RPKZ-Kgw", label: "Spotify" },
    { icon: faApple, url: "https://music.apple.com/ca/artist/wesley-robertson/1680235876", label: "Apple Music" },
    { icon: faSoundcloud, url: "https://soundcloud.com/wesmusic1?utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing", label: "SoundCloud" },
    { icon: faTiktok, url: "https://www.tiktok.com/@musicbywes_", label: "TikTok" },
    { icon: faYoutube, url: "https://youtube.com/@wesmusic1", label: "YouTube" },
  ];

  return (
    <header className="relative text-center space-y-12 pt-20 pb-10">
      <div className="flex justify-center mb-8 relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-[80%] aspect-square relative"
        >
          {/* Blurred Edges Image */}
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

          {/* Text Overlay - Removed as it's now handled in App.tsx */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
          </div>
        </motion.div>
      </div>
      <div className="flex flex-col items-center space-y-8">
        <div className="flex justify-center gap-8 py-4 flex-wrap">
          {socialLinks.map((link, index) => (
            <motion.a 
              key={link.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              whileHover={{ scale: 1.2, color: "var(--color-primary)" }}
              whileTap={{ scale: 0.9 }}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-on-surface/40 transition-colors"
              aria-label={link.label}
            >
              <FontAwesomeIcon icon={link.icon} className="text-xl" />
            </motion.a>
          ))}
        </div>
      </div>
    </header>
  );
}
