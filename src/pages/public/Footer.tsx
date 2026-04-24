import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';

interface FooterProps {
  artistName: string;
  socials: { id: string; label: string; Icon: React.FC<{ className?: string }>; href: string }[];
  contactEmail: string;
  onContact: () => void;
}

export default function Footer({ artistName, socials, contactEmail, onContact }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      className="relative border-t border-white/8 px-5 sm:px-8 pt-10 pb-8 mt-8"
      style={{ background: '#050505' }}
    >
      {/* Top row */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 max-w-2xl mx-auto">
        {/* Brand */}
        <div>
          <p className="text-xl font-black tracking-tight text-white">
            {artistName.split(' ')[0].toUpperCase()}.
          </p>
          <p className="mt-1 text-[11px] text-white/25">Artist &amp; Producer</p>
        </div>

        {/* Links */}
        <div className="flex gap-8">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-white/20 mb-2.5">
              Follow
            </p>
            <div className="flex flex-col gap-1.5">
              {socials.map(({ id, label, href }) => (
                <a
                  key={id}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] text-white/35 hover:text-white/70 transition-colors"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-white/20 mb-2.5">
              Contact
            </p>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={onContact}
                className="text-left text-[12px] text-white/35 hover:text-white/70 transition-colors"
              >
                Get in touch
              </button>
              {contactEmail && (
                <a
                  href={`mailto:${contactEmail}`}
                  className="text-[12px] text-white/20 hover:text-white/50 transition-colors truncate max-w-[160px]"
                >
                  {contactEmail}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="mt-10 flex items-center justify-between border-t border-white/6 pt-5 max-w-2xl mx-auto">
        <p className="text-[10px] text-white/18">
          &copy; {year} {artistName}. All rights reserved.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-[10px] text-white/18 hover:text-white/45 transition-colors"
        >
          <LogIn className="h-3 w-3" />
          Artist Login
        </Link>
      </div>
    </footer>
  );
}
