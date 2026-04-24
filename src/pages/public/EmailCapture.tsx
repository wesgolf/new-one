import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';

type Status = 'idle' | 'loading' | 'success';

export default function EmailCapture() {
  const [email,  setEmail]  = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error,  setError]  = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    setError(null);
    try {
      const { error: dbErr } = await supabase
        .from('email_subscribers')
        .insert({ email: email.trim().toLowerCase() });
      if (dbErr && dbErr.code !== '23505') throw dbErr;
      setStatus('success');
      setEmail('');
    } catch {
      setStatus('idle');
      setError('Something went wrong. Please try again.');
    }
  };

  return (
    <section id="contact" className="py-20 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-xl mx-auto bg-surface-container-low p-12 rounded-[2.5rem] border border-outline/5 text-center space-y-10 relative overflow-hidden shadow-2xl"
      >
        {/* Glow blurs */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="space-y-3 relative z-10">
          <h2 className="font-headline text-4xl font-black text-on-surface tracking-tighter">
            Join the Inner Circle
          </h2>
          <p className="text-on-surface/40 text-[10px] uppercase tracking-[0.3em] font-bold">
            Exclusive drops, early access &amp; tour updates
          </p>
        </div>

        <AnimatePresence mode="wait">
          {status === 'success' ? (
            <motion.div
              key="success"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-4 text-primary py-4 relative z-10"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-bold uppercase tracking-[0.2em] text-[10px]">Welcome to the journey</p>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              className="space-y-4 relative z-10"
              exit={{ opacity: 0 }}
            >
              <div className="relative">
                <input
                  type="email"
                  placeholder="EMAIL ADDRESS"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-surface-container-highest/20 border border-outline/10 rounded-2xl px-8 py-5 focus:outline-none focus:border-primary/50 transition-all text-center uppercase tracking-[0.2em] text-[10px] font-bold placeholder:text-on-surface/20 text-on-surface"
                />
              </div>
              {error && (
                <p className="text-[11px] text-red-400/70">{error}</p>
              )}
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={status === 'loading'}
                className="w-full bg-primary text-on-primary font-black uppercase tracking-[0.3em] text-[10px] px-8 py-5 rounded-2xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all disabled:opacity-50"
              >
                {status === 'loading' ? 'Processing...' : 'Subscribe'}
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>

        <p className="text-[9px] text-on-surface/20 uppercase tracking-widest relative z-10">
          By subscribing, you agree to our privacy policy
        </p>
      </motion.div>
    </section>
  );
}
