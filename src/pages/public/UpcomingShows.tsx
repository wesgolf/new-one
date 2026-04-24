import { motion } from 'motion/react';
import { MapPin, Calendar } from 'lucide-react';

export interface Show {
  id: string;
  venue: string;
  date: string;
  time?: string;
  status: 'upcoming' | 'completed';
  city?: string;
  ticket_url?: string;
}

interface UpcomingShowsProps {
  shows: Show[];
}

const PLACEHOLDER_SHOWS: Show[] = [
  { id: 'p1', venue: 'Fabric',              date: '2026-05-17', time: '10 PM',  status: 'upcoming', city: 'London, UK'       },
  { id: 'p2', venue: 'Tresor',              date: '2026-05-31', time: '11 PM',  status: 'upcoming', city: 'Berlin, DE'       },
  { id: 'p3', venue: 'Output',              date: '2026-06-14', time: '9 PM',   status: 'upcoming', city: 'New York, USA'    },
  { id: 'p4', venue: 'Berghain',            date: '2026-07-04', time: '12 AM',  status: 'upcoming', city: 'Berlin, DE'       },
];

export default function UpcomingShows({ shows }: UpcomingShowsProps) {
  const displayShows = shows.length > 0 ? shows : PLACEHOLDER_SHOWS;

  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.36em] text-white/25">
        Shows
      </p>
      <h2 className="mb-6 text-3xl font-black tracking-tight text-white">
        Upcoming
      </h2>

      <div className="space-y-2">
        {displayShows.map((show, i) => {
          const d = new Date(show.date);
          const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
          const day   = d.getDate();

          return (
            <motion.div
              key={show.id}
              className="group flex items-center gap-4 rounded-2xl border border-white/6 p-4 transition-all hover:border-white/15 hover:bg-white/3"
              style={{ background: '#0a0a0a' }}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              {/* Date block */}
              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <p className="text-[8px] font-black uppercase tracking-wider text-white/35">{month}</p>
                <p className="text-lg font-black leading-none text-white">{day}</p>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white truncate">{show.venue}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {(show.city) && (
                    <span className="flex items-center gap-1 text-[10px] text-white/30">
                      <MapPin className="h-2.5 w-2.5" />
                      {show.city}
                    </span>
                  )}
                  {show.time && (
                    <span className="flex items-center gap-1 text-[10px] text-white/30">
                      <Calendar className="h-2.5 w-2.5" />
                      {show.time}
                    </span>
                  )}
                </div>
              </div>

              {/* Ticket CTA */}
              {show.ticket_url ? (
                <a
                  href={show.ticket_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-full bg-white px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-black hover:scale-105 transition-transform shadow-[0_0_12px_rgba(255,255,255,0.15)]"
                >
                  Tickets
                </a>
              ) : (
                <span className="shrink-0 rounded-full border border-white/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/25 group-hover:border-white/20 group-hover:text-white/40 transition-colors">
                  RSVP
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
