import { motion } from "motion/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpotify, faApple, faSoundcloud } from "@fortawesome/free-brands-svg-icons";
import { faPlay } from "@fortawesome/free-solid-svg-icons";

export default function FeaturedRelease() {
  const artwork = "https://lh3.googleusercontent.com/aida-public/AB6AXuAwkzItrY6j5QJ9O_Qw5my1E9s1PKxM45Gd6bwa8qDuaE-dMA5FrxzfDQ91zh2ku_5bDDi_0DPyv7zPMk6aDj3wZflNgdu02Q2cMhhnE44XohcEJ4rM2zvHhmR4yWwf7yAVZQIK38YrLflwl80mfakfY0wE7rDO8qfeHd_QwPpGNnjJ47BoQZvpHQN6jWP7plc8sjHx80OCe-en-Uj6PWF4NqPPv93SZjr88NINaETIT2pQn6X5MQwTw_NroGiN30PT9Jlax962P34";

  return (
    <div className="w-full">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-surface-container-low rounded-3xl overflow-hidden border border-outline/5 shadow-xl flex flex-col sm:flex-row items-center sm:items-stretch"
      >
        <div className="w-full sm:w-48 aspect-square relative group overflow-hidden shrink-0">
          <img 
            src={artwork} 
            alt="Neon Horizon" 
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

        <div className="p-6 flex-1 flex flex-col justify-center text-center sm:text-left space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest rounded-full border border-primary/20">New Release</span>
            </div>
            <h2 className="font-headline text-2xl font-black tracking-tighter text-on-surface">
              Neon Horizon
            </h2>
            <p className="text-[10px] font-medium text-on-surface/40 uppercase tracking-widest">
              Out now on all platforms
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <motion.a
              href="https://open.spotify.com/artist/2tMGlOELT6IvxS5xZItMk3"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-3 bg-primary text-on-primary text-xs font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
            >
              Stream Now
            </motion.a>

            <div className="flex gap-2">
              {[
                { icon: faSpotify, url: "https://open.spotify.com/artist/2tMGlOELT6IvxS5xZItMk3", label: "Spotify" },
                { icon: faApple, url: "https://music.apple.com/ca/artist/wesley-robertson/1680235876", label: "Apple" },
                { icon: faSoundcloud, url: "https://soundcloud.com/wesmusic1", label: "SoundCloud" },
              ].map((platform) => (
                <motion.a
                  key={platform.label}
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ y: -2 }}
                  className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface/60 hover:text-primary transition-colors border border-outline/5"
                  aria-label={platform.label}
                >
                  <FontAwesomeIcon icon={platform.icon} className="text-base" />
                </motion.a>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
