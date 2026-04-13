import React, { useState } from 'react';
import { 
  X, 
  Zap, 
  Youtube, 
  Music, 
  Cloud, 
  ArrowRight,
  CheckCircle2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Release } from '../types';
import { cn } from '../lib/utils';

interface PromoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPromote: (data: { uploadSoundCloud: boolean; uploadYouTube: boolean }) => Promise<void>;
  idea: Release | null;
}

export function PromoteModal({ isOpen, onClose, onPromote, idea }: PromoteModalProps) {
  const [uploadSoundCloud, setUploadSoundCloud] = useState(false);
  const [uploadYouTube, setUploadYouTube] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [step, setStep] = useState<'config' | 'uploading'>('config');
  const [uploadStatus, setUploadStatus] = useState({
    soundcloud: 'pending',
    youtube: 'pending'
  });

  const handlePromoteClick = async () => {
    if (!uploadSoundCloud && !uploadYouTube) {
      await onPromote({ uploadSoundCloud: false, uploadYouTube: false });
      return;
    }

    setStep('uploading');
    setIsPromoting(true);

    // Simulate API calls since they are "optional for now"
    if (uploadSoundCloud) {
      setUploadStatus(prev => ({ ...prev, soundcloud: 'loading' }));
      await new Promise(r => setTimeout(r, 1500));
      setUploadStatus(prev => ({ ...prev, soundcloud: 'success' }));
    }

    if (uploadYouTube) {
      setUploadStatus(prev => ({ ...prev, youtube: 'loading' }));
      await new Promise(r => setTimeout(r, 2000));
      setUploadStatus(prev => ({ ...prev, youtube: 'success' }));
    }

    await new Promise(r => setTimeout(r, 500));
    await onPromote({ uploadSoundCloud, uploadYouTube });
    setIsPromoting(false);
  };

  if (!isOpen || !idea) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden"
      >
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
              <Zap className="w-6 h-6 text-white fill-current" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Promote Track</h3>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-0.5">Finalize Release</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {step === 'config' ? (
              <motion.div 
                key="config"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Promoting</p>
                  <p className="text-lg font-bold text-slate-900">{idea.title}</p>
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-bold text-slate-900">Optional: Automated Uploads</p>
                  
                  <button 
                    onClick={() => setUploadSoundCloud(!uploadSoundCloud)}
                    className={cn(
                      "w-full p-4 rounded-2xl border transition-all flex items-center justify-between group",
                      uploadSoundCloud 
                        ? "bg-orange-50 border-orange-200 ring-2 ring-orange-500/20" 
                        : "bg-white border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-3 rounded-xl transition-colors",
                        uploadSoundCloud ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-400"
                      )}>
                        <Cloud className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-900">SoundCloud</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Upload as Private/Public</p>
                      </div>
                    </div>
                    <div className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                      uploadSoundCloud ? "bg-orange-500 border-orange-500" : "border-slate-200"
                    )}>
                      {uploadSoundCloud && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                  </button>

                  <button 
                    onClick={() => setUploadYouTube(!uploadYouTube)}
                    className={cn(
                      "w-full p-4 rounded-2xl border transition-all flex items-center justify-between group",
                      uploadYouTube 
                        ? "bg-rose-50 border-rose-200 ring-2 ring-rose-500/20" 
                        : "bg-white border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-3 rounded-xl transition-colors",
                        uploadYouTube ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-400"
                      )}>
                        <Youtube className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-900">YouTube</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Upload with Visualizer</p>
                      </div>
                    </div>
                    <div className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                      uploadYouTube ? "bg-rose-500 border-rose-500" : "border-slate-200"
                    )}>
                      {uploadYouTube && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                  </button>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={handlePromoteClick}
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                  >
                    Confirm Promotion
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="uploading"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8 py-4"
              >
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900">Processing Promotion</h4>
                  <p className="text-sm text-slate-500">We're handling your automated uploads...</p>
                </div>

                <div className="space-y-3">
                  {uploadSoundCloud && (
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <Cloud className="w-5 h-5 text-orange-500" />
                        <span className="text-sm font-bold text-slate-900">SoundCloud Upload</span>
                      </div>
                      {uploadStatus.soundcloud === 'loading' ? (
                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      )}
                    </div>
                  )}
                  {uploadYouTube && (
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <Youtube className="w-5 h-5 text-rose-500" />
                        <span className="text-sm font-bold text-slate-900">YouTube Upload</span>
                      </div>
                      {uploadStatus.youtube === 'loading' ? (
                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
