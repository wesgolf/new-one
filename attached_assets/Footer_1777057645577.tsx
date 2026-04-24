export default function Footer() {
  return (
    <footer className="w-full py-24 bg-background flex flex-col items-center gap-12 px-8 text-center border-t border-outline/5">
      <div className="font-headline font-black text-4xl text-on-surface tracking-tighter">WES.</div>
      
      <div className="flex flex-wrap justify-center gap-x-12 gap-y-6">
        <a className="text-[10px] text-on-surface/30 tracking-[0.3em] uppercase font-bold hover:text-primary transition-colors" href="#">Privacy</a>
        <a className="text-[10px] text-on-surface/30 tracking-[0.3em] uppercase font-bold hover:text-primary transition-colors" href="#">Terms</a>
        <a className="text-[10px] text-on-surface/30 tracking-[0.3em] uppercase font-bold hover:text-primary transition-colors" href="#">Press Kit</a>
        <a className="text-[10px] text-on-surface/30 tracking-[0.3em] uppercase font-bold hover:text-primary transition-colors" href="#">Contact</a>
      </div>

      <div className="space-y-4">
        <p className="text-[10px] text-on-surface/20 tracking-[0.4em] uppercase font-black">© 2024 WES. BEYOND THE VOID.</p>
        <div className="h-px w-12 bg-primary/20 mx-auto"></div>
      </div>
    </footer>
  );
}
