import React from 'react';
import { 
  Play, 
  Heart, 
  Instagram, 
  Music, 
  Mic2, 
  TrendingUp,
  MoreVertical
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Release } from '../types';

export function TrackFocusCard({ track, onAction }: { track?: Release | null, onAction?: (msg: string) => void }) {
  const streams = Object.values(track?.performance?.streams || {}).reduce((sum: number, val: any) => sum + (val || 0), 0);
  const saves = track?.performance?.engagement?.saves || 0;
  const conversionRate = streams > 0 ? (saves / streams) * 100 : 0;
  const isHighConversion = conversionRate > 10;

  return (
    <section className="glass-card p-8 group hover:border-blue-200 transition-all">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Music className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Track Command Center</h3>
        </div>
        {track && (
          <button className="p-2 hover:bg-slate-50 rounded-lg transition-all text-slate-400 hover:text-slate-600">
            <MoreVertical className="w-5 h-5" />
          </button>
        )}
      </div>

      {track ? (
        <>
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="relative shrink-0">
              <img 
                src={track.assets?.cover_art_url || '/placeholder-cover.svg'} 
                alt={track.title} 
                className="w-32 h-32 rounded-2xl shadow-xl group-hover:scale-105 transition-transform duration-500 object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.src = '/placeholder-cover.svg'; }}
              />
              <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-xl shadow-lg">
                <Play className="w-4 h-4 fill-current" />
              </div>
            </div>

            <div className="flex-1 space-y-6 w-full">
              <div>
                <h4 className="text-2xl font-bold text-slate-900">{track.title}</h4>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Current Focus Track</p>
              </div>

              {track.rationale && (
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
                  <p className="text-xs text-blue-800 leading-relaxed italic">
                    <span className="font-bold uppercase tracking-widest text-[10px] block mb-1 opacity-60">AI Rationale</span>
                    "{track.rationale}"
                  </p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Streams</p>
                  <p className="text-xl font-bold text-slate-900">{streams.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Saves</p>
                  <p className="text-xl font-bold text-slate-900">{saves.toLocaleString()}</p>
                </div>
                <div className={cn(
                  "p-4 rounded-2xl border transition-colors",
                  isHighConversion ? "bg-emerald-50 border-emerald-100" : "bg-blue-50 border-blue-100"
                )}>
                  <p className={cn(
                    "text-[10px] font-bold uppercase tracking-widest mb-1",
                    isHighConversion ? "text-emerald-600" : "text-blue-600"
                  )}>Conversion</p>
                  <p className={cn(
                    "text-xl font-bold",
                    isHighConversion ? "text-emerald-700" : "text-blue-700"
                  )}>{conversionRate.toFixed(1)}%</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => onAction?.("Opening Instagram Stories...")}
                  className="btn-secondary text-xs py-2.5"
                >
                  <Instagram className="w-4 h-4 text-pink-500" />
                  Push to Instagram
                </button>
                <button 
                  onClick={() => onAction?.("Sending track to DJ promo list...")}
                  className="btn-secondary text-xs py-2.5"
                >
                  <Mic2 className="w-4 h-4 text-blue-500" />
                  Send to DJs
                </button>
                <button 
                  onClick={() => onAction?.("Generating viral content ideas...")}
                  className="btn-primary text-xs py-2.5 bg-blue-600 hover:bg-blue-500"
                >
                  <TrendingUp className="w-4 h-4" />
                  Generate Content Idea
                </button>
              </div>
            </div>
          </div>

          {isHighConversion && (
            <div className="mt-8 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                <TrendingUp className="w-4 h-4" />
              </div>
              <p className="text-sm text-emerald-700 font-medium">
                <span className="font-bold">High Conversion Signal:</span> This track is converting listeners to saves at a top-tier rate. Increase ad spend or post more content to capitalize.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="py-12 flex flex-col items-center justify-center text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
            <Music className="w-8 h-8 text-slate-300" />
          </div>
          <h4 className="text-lg font-bold text-slate-900">No Focus Track</h4>
          <p className="text-sm text-slate-500 max-w-[280px] mt-2 mb-6">
            Select a track from your library to start tracking its daily growth and conversion.
          </p>
          <button 
            onClick={() => onAction?.("Opening track selector...")}
            className="btn-primary"
          >
            Select Track
          </button>
        </div>
      )}
    </section>
  );
}
