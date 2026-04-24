import { motion } from "motion/react";
import { useState, FormEvent } from "react";

export default function EmailCapture() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    setTimeout(() => {
      setStatus("success");
      setEmail("");
    }, 1500);
  };

  return (
    <section id="contact" className="py-20 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-xl mx-auto bg-surface-container-low p-12 rounded-[2.5rem] border border-outline/5 text-center space-y-10 relative overflow-hidden shadow-2xl"
      >
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 blur-[100px] rounded-full"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary/5 blur-[100px] rounded-full"></div>
        
        <div className="space-y-3 relative z-10">
          <h2 className="font-headline text-4xl font-black text-on-surface tracking-tighter">Join the Inner Circle</h2>
          <p className="text-on-surface/40 text-[10px] uppercase tracking-[0.3em] font-bold">Exclusive drops, early access & tour updates</p>
        </div>

        {status === "success" ? (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-4 text-primary py-4"
          >
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl">check_circle</span>
            </div>
            <p className="font-bold uppercase tracking-[0.2em] text-[10px]">Welcome to the journey</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            <div className="relative">
              <input 
                type="email" 
                placeholder="EMAIL ADDRESS" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface-container-highest/20 border border-outline/10 rounded-2xl px-8 py-5 focus:outline-none focus:border-primary/50 transition-all text-center uppercase tracking-[0.2em] text-[10px] font-bold placeholder:text-on-surface/20"
              />
            </div>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={status === "loading"}
              className="w-full bg-primary text-on-primary font-black uppercase tracking-[0.3em] text-[10px] px-8 py-5 rounded-2xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all disabled:opacity-50"
            >
              {status === "loading" ? "Processing..." : "Subscribe"}
            </motion.button>
          </form>
        )}
        
        <p className="text-[9px] text-on-surface/20 uppercase tracking-widest relative z-10">
          By subscribing, you agree to our privacy policy
        </p>
      </motion.div>
    </section>
  );
}
