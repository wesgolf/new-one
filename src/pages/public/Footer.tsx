interface FooterProps {
  pressKitUrl:  string;
}

export default function Footer({ pressKitUrl }: FooterProps) {
  return (
    <footer className="w-full border-t border-outline/5 bg-background px-6 py-10 text-center">
      <div className="font-headline text-3xl font-black tracking-tighter text-on-surface">
        WES.
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-x-10 gap-y-4">
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
        <a
          href="/login"
          className="text-[10px] text-on-surface/30 tracking-[0.3em] uppercase font-bold hover:text-primary transition-colors"
        >
          Artist Login
        </a>
      </div>
    </footer>
  );
}
