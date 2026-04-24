import { motion } from "motion/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faShareAlt } from "@fortawesome/free-solid-svg-icons";
import { faSpotify } from "@fortawesome/free-brands-svg-icons";

const popularTracks = [
  { id: 1, title: "Infinite Echoes", streams: "8.4M", duration: "3:42" },
  { id: 2, title: "Digital Ghost", streams: "5.2M", duration: "4:15" },
  { id: 3, title: "Midnight Pulse", streams: "3.9M", duration: "3:58" },
];

export default function PopularTracks() {
  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between px-2">
        <h2 className="font-headline text-2xl font-black tracking-tight text-on-surface">Popular Tracks</h2>
        <motion.a 
          href="https://open.spotify.com/artist/2tMGlOELT6IvxS5xZItMk3"
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.05 }}
          className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2"
        >
          <FontAwesomeIcon icon={faSpotify} />
          View All
        </motion.a>
      </div>

      <div className="space-y-2">
        {popularTracks.map((track, index) => (
          <motion.div 
            key={track.id}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center justify-between p-4 bg-surface-container-low/40 hover:bg-surface-container-low rounded-2xl border border-outline/5 transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-5">
              <div className="w-10 h-10 bg-surface-container-high rounded-xl flex items-center justify-center text-on-surface/20 group-hover:text-primary transition-colors">
                <FontAwesomeIcon icon={faPlay} className="text-xs" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors">{track.title}</h4>
                <p className="text-[10px] text-on-surface/30 uppercase tracking-widest font-medium">{track.streams} Streams</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <span className="text-[10px] font-mono text-on-surface/20">{track.duration}</span>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                className="text-on-surface/20 hover:text-on-surface transition-colors"
              >
                <FontAwesomeIcon icon={faShareAlt} className="text-xs" />
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
