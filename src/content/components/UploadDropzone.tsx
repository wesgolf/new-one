import React, { useState, useRef, useCallback } from 'react';
import { Upload, Film, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface UploadDropzoneProps {
  onUploadComplete: (file: File, previewUrl: string) => void;
  existingVideoUrl?: string;
  compact?: boolean;
}

export function UploadDropzone({ onUploadComplete, existingVideoUrl, compact }: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingVideoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== 'video/mp4' && !file.name.toLowerCase().endsWith('.mp4')) {
      setError('Only .mp4 video files are supported');
      return;
    }

    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size must be under 500MB');
      return;
    }

    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      setUploadProgress(100);
      clearInterval(interval);
      onUploadComplete(file, localUrl);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      setPreviewUrl(null);
      clearInterval(interval);
    } finally {
      setIsUploading(false);
    }
  }, [onUploadComplete]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const clearVideo = () => {
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (previewUrl && !isUploading) {
    return (
      <div className={cn("relative rounded-2xl overflow-hidden bg-black", compact ? "h-48" : "h-64")}>
        <video
          src={previewUrl}
          className="w-full h-full object-contain"
          controls
          playsInline
        />
        <button
          onClick={clearVideo}
          className="absolute top-3 right-3 w-8 h-8 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={cn(
        "relative border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all",
        compact ? "p-6" : "p-10",
        isDragging
          ? "border-blue-400 bg-blue-50/50"
          : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/30",
        isUploading && "pointer-events-none"
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,.mp4"
        onChange={handleFileSelect}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {isUploading ? (
          <motion.div
            key="uploading"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-4"
          >
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <div className="w-48">
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-blue-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-2 text-center font-medium">
                Uploading... {Math.round(uploadProgress)}%
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3"
          >
            <div className={cn(
              "rounded-2xl flex items-center justify-center",
              compact ? "w-12 h-12" : "w-16 h-16",
              isDragging ? "bg-blue-100" : "bg-slate-100"
            )}>
              {isDragging ? (
                <Film className={cn("text-blue-500", compact ? "w-6 h-6" : "w-8 h-8")} />
              ) : (
                <Upload className={cn("text-slate-400", compact ? "w-6 h-6" : "w-8 h-8")} />
              )}
            </div>
            <div className="text-center">
              <p className={cn("font-black text-slate-700", compact ? "text-sm" : "text-base")}>
                {isDragging ? 'Drop your video here' : 'Upload MP4 Video'}
              </p>
              {!compact && (
                <p className="text-xs text-slate-400 mt-1">
                  Drag & drop or click to browse · Max 500MB
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute bottom-3 left-3 right-3 flex items-center gap-2 bg-red-50 text-red-600 text-xs font-medium px-3 py-2 rounded-xl"
          >
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
