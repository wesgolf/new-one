import React from 'react';
import { useArtistData } from '../hooks/useArtistData';
import { Release } from '../types';
import { Music, Cloud, Zap, Sparkles, ExternalLink, Mail } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export function CollabPortal() {
  const { data: releases, loading } = useArtistData<Release>('releases');
  
  const publicIdeas = releases.filter(r => r.is_public && r.status !== 'released');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="bg-slate-900 text-white py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#3b82f6,transparent_70%)]" />
        </div>
        
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex flex-col items-center text-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/20 rounded-full border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-widest mb-8"
            >
              <Sparkles className="w-4 h-4" />
              Artist Collaboration Portal
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-tight"
            >
              Collaborate on my <span className="text-blue-500">Latest Projects.</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed mb-10"
            >
              Welcome to my creative workspace. I've curated a selection of works-in-progress, demos, and stems that are currently open for collaboration. Whether you're a producer, vocalist, or songwriter, I'm looking for fresh perspectives to help take these tracks to the finish line.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap items-center justify-center gap-4"
            >
              <a 
                href="mailto:wesleyrob27@gmail.com"
                className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
              >
                <Mail className="w-5 h-5" />
                General Inquiries
              </a>
              <div className="px-6 py-4 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl text-slate-300 text-sm font-medium">
                Active Projects: {publicIdeas.length}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Ideas Grid */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Open Projects</h2>
            <p className="text-slate-500 mt-1">Select an idea to view details and assets.</p>
          </div>
          <div className="px-4 py-2 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">{publicIdeas.length} Available</span>
          </div>
        </div>

        {publicIdeas.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-[3rem] border border-dashed border-slate-200">
            <Music className="w-16 h-16 text-slate-200 mx-auto mb-6" />
            <h3 className="text-xl font-bold text-slate-900">No public ideas yet</h3>
            <p className="text-slate-500 mt-2">Check back soon for new collaboration opportunities.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {publicIdeas.map((idea, index) => (
              <motion.div
                key={idea.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-card group hover:border-blue-200 transition-all duration-300"
              >
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-blue-100">
                      {idea.type || 'Original'}
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl text-slate-400">
                      <Zap className="w-4 h-4" />
                    </div>
                  </div>

                  <h3 className="text-2xl font-bold text-slate-900 mb-3">{idea.title}</h3>
                  <p className="text-slate-500 text-sm line-clamp-3 mb-8 leading-relaxed">
                    {idea.rationale || "This track is in the early stages and open for creative input. Looking for specific vibes and sound design."}
                  </p>

                  <div className="space-y-3 mb-8">
                    {idea.production?.project_file_url && (
                      <a 
                        href={idea.production.project_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-blue-50 hover:text-blue-600 transition-all group/link border border-slate-100 hover:border-blue-100"
                      >
                        <div className="flex items-center gap-3">
                          <Cloud className="w-5 h-5" />
                          <span className="text-sm font-bold">Listen to Demo</span>
                        </div>
                        <ExternalLink className="w-4 h-4 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                      </a>
                    )}
                    {idea.production?.stems_url && (
                      <a 
                        href={idea.production.stems_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-purple-50 hover:text-purple-600 transition-all group/link border border-slate-100 hover:border-purple-100"
                      >
                        <div className="flex items-center gap-3">
                          <Music className="w-5 h-5" />
                          <span className="text-sm font-bold">Download Stems</span>
                        </div>
                        <ExternalLink className="w-4 h-4 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                      </a>
                    )}
                  </div>

                  <a 
                    href={`mailto:wesleyrob27@gmail.com?subject=Collab Request: ${idea.title}`}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-lg shadow-slate-200"
                  >
                    <Mail className="w-4 h-4" />
                    Request Collaboration
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
