import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function EmailCapture() {
  const [email,    setEmail]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { error: dbErr } = await supabase
        .from('email_subscribers')
        .insert({ email: email.trim().toLowerCase() });
      if (dbErr && dbErr.code !== '23505') throw dbErr; // ignore duplicate key
      setSuccess(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl border border-white/8 p-7 sm:p-10 text-center"
      style={{ background: '#111111' }}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Decorative glow */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)' }}
      />

      <AnimatePresence mode="wait">
        {!success ? (
          <motion.div key="form" exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-white/25 mb-2">
              Stay Connected
            </p>
            <h3 className="text-2xl font-black tracking-tight text-white mb-2">
              Join the Inner Circle
            </h3>
            <p className="text-sm text-white/35 mb-7 max-w-xs mx-auto">
              First access to new music, exclusive mixes, show announcements, and behind-the-scenes content.
            </p>

            <form onSubmit={handleSubmit} className="flex gap-2 max-w-sm mx-auto">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="flex-1 min-w-0 rounded-full border border-white/12 bg-white/5 px-5 py-3 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={loading}
                className="flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-black hover:scale-105 transition-transform disabled:opacity-50 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_28px_rgba(255,255,255,0.35)]"
              >
                <span className="hidden sm:inline">{loading ? 'Joining…' : 'Join'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>

            {error && (
              <p className="mt-3 text-xs text-red-400/70">{error}</p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 mb-4">
              <Check className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-black text-white">You're in.</h3>
            <p className="mt-1 text-sm text-white/35">Watch your inbox.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
