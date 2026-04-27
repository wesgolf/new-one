import { Link } from 'react-router-dom';

interface FooterProps {
  contactEmail: string;
  pressKitUrl:  string;
  onContact:    () => void;
}

export default function Footer({ contactEmail, pressKitUrl, onContact }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full py-24 bg-background flex flex-col items-center gap-12 px-8 text-center border-t border-outline/5">
      <div className="font-headline font-black text-4xl text-on-surface tracking-tighter">
        WES.
      </div>

      <div className="flex flex-wrap justify-center gap-x-12 gap-y-6">
        {pressKitUrl && (
          <a
            href={pressKitUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-on-surface/30 tracking-[0.3em] uppercase font-bold hover:text-primary transition-colors"
          >
            Press Kit
          </a>
        )}
        <button
          type="button"
          onClick={onContact}
          className="text-[10px] text-on-surface/30 tracking-[0.3em] uppercase font-bold hover:text-primary transition-colors"
        >
          Contact
        </button>
        <Link
          to="/login"
          className="text-[10px] text-on-surface/30 tracking-[0.3em] uppercase font-bold hover:text-primary transition-colors"
        >
          Artist Login
        </Link>
        {contactEmail && (
          <a
            href={`mailto:${contactEmail}`}
            className="text-[10px] text-on-surface/30 tracking-[0.3em] uppercase font-bold hover:text-primary transition-colors"
          >
            Email
          </a>
        )}
      </div>

      <div className="space-y-4">
        <p className="text-[10px] text-on-surface/20 tracking-[0.4em] uppercase font-black">
          © {year} WES. BEYOND THE VOID.
        </p>
        <div className="h-px w-12 bg-primary/20 mx-auto" />
      </div>
    </footer>
  );
}
