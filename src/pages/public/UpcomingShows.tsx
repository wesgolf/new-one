import { motion } from 'motion/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTicketAlt, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';

export interface Show {
  id:          string;
  venue:       string;
  date:        string;
  time?:       string;
  status:      'upcoming' | 'completed';
  city?:       string;
  ticket_url?: string;
}

interface UpcomingShowsProps {
  shows: Show[];
}

export default function UpcomingShows({ shows }: UpcomingShowsProps) {
  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between px-2">
        <h2 className="font-headline text-2xl font-black tracking-tight text-on-surface">
          Tour Dates
        </h2>
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface/30">
          Global Tour 2025
        </p>
      </div>

      {shows.length === 0 ? (
        /* Empty state */
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
            <p className="text-[10px] text-on-surface/30 uppercase tracking-widest font-medium">
              Check back soon for new dates
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {shows.map((show, i) => {
            const d     = new Date(show.date);
            const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
            const day   = d.getDate();

            return (
              <motion.div
                key={show.id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="group flex items-center gap-4 p-4 bg-surface-container-low/40 hover:bg-surface-container-low rounded-2xl border border-outline/5 transition-all"
              >
                {/* Date badge */}
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-outline/10 bg-surface-container-high">
                  <p className="text-[8px] font-black uppercase tracking-wider text-on-surface/35">{month}</p>
                  <p className="text-lg font-black leading-none text-on-surface">{day}</p>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-on-surface">{show.venue}</p>
                  {(show.city || show.time) && (
                    <div className="flex items-center gap-3 mt-0.5">
                      {show.city && (
                        <span className="flex items-center gap-1 text-[10px] text-on-surface/30 uppercase tracking-widest font-medium">
                          <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[9px]" />
                          {show.city}
                        </span>
                      )}
                      {show.time && (
                        <span className="text-[10px] text-on-surface/30 uppercase tracking-widest font-medium">
                          {show.time}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Ticket button */}
                {show.ticket_url ? (
                  <a
                    href={show.ticket_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 px-4 py-1.5 bg-primary text-on-primary text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-105 transition-all"
                  >
                    Tickets
                  </a>
                ) : (
                  <span className="shrink-0 px-4 py-1.5 border border-outline/10 text-on-surface/30 text-[10px] font-bold uppercase tracking-widest rounded-full group-hover:border-outline/20 group-hover:text-on-surface/50 transition-colors">
                    RSVP
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}
