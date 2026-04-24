import { motion } from "motion/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faCalendarAlt, faVideo, faMusic } from "@fortawesome/free-solid-svg-icons";
import FeaturedRelease from "./FeaturedRelease";

const cards = [
  {
    type: "radio",
    title: "Latest Radio Mix",
    subtitle: "Wes Radio #042",
    cta: "Listen Now",
    icon: faPlay,
    color: "bg-secondary",
    href: "#radio",
  },
  {
    type: "reel",
    title: "Watch Latest Reel",
    subtitle: "Behind the scenes at Red Rocks",
    cta: "Watch Now",
    icon: faVideo,
    color: "bg-primary",
    href: "https://instagram.com/musicbywes_",
  },
];

export default function FeaturedSection() {
  return (
    <div className="space-y-6">
      {/* Main Release Card */}
      <FeaturedRelease />

      {/* Stacked Secondary Cards */}
      <div className="grid gap-3">
        {cards.map((card, index) => (
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
            <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center text-on-primary shadow-md shrink-0`}>
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
