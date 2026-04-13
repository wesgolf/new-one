import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={cn(
        "fixed bottom-8 right-8 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-md",
        type === 'success' && "bg-emerald-50/90 border-emerald-100 text-emerald-900",
        type === 'error' && "bg-rose-50/90 border-rose-100 text-rose-900",
        type === 'info' && "bg-blue-50/90 border-blue-100 text-blue-900"
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
        type === 'success' && "bg-emerald-100 text-emerald-600",
        type === 'error' && "bg-rose-100 text-rose-600",
        type === 'info' && "bg-blue-100 text-blue-600"
      )}>
        {type === 'success' && <CheckCircle2 className="w-5 h-5" />}
        {type === 'error' && <AlertCircle className="w-5 h-5" />}
        {type === 'info' && <Info className="w-5 h-5" />}
      </div>
      <p className="text-sm font-bold">{message}</p>
      <button 
        onClick={onClose}
        className="ml-4 p-1 hover:bg-black/5 rounded-lg transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
