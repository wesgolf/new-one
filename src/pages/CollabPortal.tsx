import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Headphones, Link2, Music2, Share2 } from 'lucide-react';
import { fetchIdeaAssets, fetchIdeaComments, fetchIdeas } from '../lib/supabaseData';
import { ARTIST_INFO } from '../constants';
import type { IdeaAsset, IdeaComment, IdeaRecord } from '../types/domain';

export function CollabPortal() {
  const { shareId } = useParams();
  const [ideas, setIdeas] = useState<IdeaRecord[]>([]);
  const [assets, setAssets] = useState<Record<string, IdeaAsset[]>>({});
  const [comments, setComments] = useState<Record<string, IdeaComment[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const rows = await fetchIdeas();
        const publicIdeas = rows.filter((idea) => idea.is_public);
        setIdeas(publicIdeas);
        await Promise.all(
          publicIdeas.map(async (idea) => {
            const [ideaAssets, ideaComments] = await Promise.all([fetchIdeaAssets(idea.id), fetchIdeaComments(idea.id)]);
            setAssets((current) => ({ ...current, [idea.id]: ideaAssets }));
            setComments((current) => ({ ...current, [idea.id]: ideaComments }));
          })
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const selected = useMemo(() => {
    if (!shareId) return null;
    return ideas.find((idea) => idea.share_slug === shareId || idea.id === shareId) || null;
  }, [ideas, shareId]);

  if (loading) {
    return <div className="min-h-screen bg-light-bg p-8 text-sm text-text-secondary">Loading collaboration portal...</div>;
  }

  const renderedIdeas = selected ? [selected] : ideas;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e0f2fe,transparent_32%),linear-gradient(180deg,#f8fafc,#eef2ff)] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="overflow-hidden rounded-[2.5rem] border border-white/70 bg-white/80 p-8 shadow-xl backdrop-blur-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
                <Share2 className="h-3.5 w-3.5" />
                Public collaboration hub
              </div>
              <h1 className="mt-5 text-5xl font-bold tracking-tight text-slate-950">{ARTIST_INFO.name}</h1>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Review work-in-progress tracks, listen to uploaded MP3s, and leave notes with the same route working for direct links and refreshes.
              </p>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-slate-50 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Open ideas</p>
              <p className="mt-2 text-3xl font-bold text-text-primary">{ideas.length}</p>
            </div>
          </div>
        </header>

        {renderedIdeas.length === 0 ? (
          <div className="rounded-[2rem] border border-border bg-white p-10 text-center shadow-sm">
            <Music2 className="mx-auto h-10 w-10 text-border" />
            <p className="mt-3 text-sm text-text-secondary">No public collaboration items are available yet.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {renderedIdeas.map((idea) => {
              const ideaAssets = assets[idea.id] || [];
              const ideaComments = comments[idea.id] || [];
              const audioAsset = ideaAssets.find((asset) => asset.asset_type === 'audio');
              const linkAssets = ideaAssets.filter((asset) => asset.asset_type !== 'audio');

              return (
                <article key={idea.id} className="rounded-[2rem] border border-border bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="max-w-3xl">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">{idea.status}</p>
                      <h2 className="mt-2 text-3xl font-bold text-text-primary">{idea.title}</h2>
                      <p className="mt-3 text-sm leading-7 text-text-secondary">{idea.description || 'No description added yet.'}</p>
                    </div>
                    {!selected && (
                      <Link className="btn-secondary" to={`/collab/${idea.share_slug || idea.id}`}>
                        Open direct review link
                      </Link>
                    )}
                  </div>

                  <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
                    <div className="rounded-[1.75rem] bg-slate-50 p-5">
                      <div className="flex items-center gap-2">
                        <Headphones className="h-4 w-4 text-text-tertiary" />
                        <h3 className="text-lg font-semibold text-text-primary">Audio review</h3>
                      </div>
                      {audioAsset ? (
                        <audio className="mt-4 w-full" controls src={audioAsset.file_url} />
                      ) : (
                        <p className="mt-4 text-sm text-text-secondary">No MP3 uploaded yet.</p>
                      )}

                      {linkAssets.length > 0 && (
                        <div className="mt-5 flex flex-wrap gap-3">
                          {linkAssets.map((asset) => (
                            <a key={asset.id} className="btn-secondary" href={asset.file_url} target="_blank" rel="noreferrer">
                              <Link2 className="h-4 w-4" />
                              {asset.metadata?.label || 'Project link'}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-[1.75rem] border border-border p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Comments</p>
                      <div className="mt-4 space-y-3">
                        {ideaComments.length === 0 ? (
                          <p className="text-sm text-text-secondary">No comments yet.</p>
                        ) : (
                          ideaComments.map((comment) => (
                            <div key={comment.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">
                                {comment.timestamp_seconds != null ? `${Math.floor(comment.timestamp_seconds / 60)}:${String(Math.floor(comment.timestamp_seconds % 60)).padStart(2, '0')}` : 'General note'}
                              </p>
                              <p className="mt-2 text-sm text-text-primary">{comment.body}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
