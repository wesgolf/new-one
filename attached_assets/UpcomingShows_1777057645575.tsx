import { motion } from "motion/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTicketAlt, faMapMarkerAlt } from "@fortawesome/free-solid-svg-icons";

export default function UpcomingShows() {
  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between px-2">
        <h2 className="font-headline text-2xl font-black tracking-tight text-on-surface">Tour Dates</h2>
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface/30">Global Tour 2024</p>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="py-12 px-6 bg-surface-container-low/40 rounded-3xl border border-outline/5 text-center space-y-4"
      >
        <div className="w-12 h-12 bg-surface-container-high rounded-full flex items-center justify-center mx-auto text-on-surface/20">
          <FontAwesomeIcon icon={faTicketAlt} className="text-lg" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-on-surface/60">No upcoming shows</p>
          <p className="text-[10px] text-on-surface/30 uppercase tracking-widest font-medium">Check back soon for new dates</p>
        </div>
      </motion.div>
    </section>
  );
}
