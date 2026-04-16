import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Disc3, Lock, Mail } from 'lucide-react';
import { ARTIST_INFO } from '../constants';
import { publicHubLinks } from '../content/publicHubLinks';
import { fetchReleases } from '../lib/supabaseData';
import type { ReleaseRecord } from '../types/domain';

interface PublicHubProps {
  authPanel?: React.ReactNode;
}

export function PublicHub({ authPanel }: PublicHubProps) {
  const [featuredRelease, setFeaturedRelease] = useState<ReleaseRecord | null>(null);

  useEffect(() => {
    fetchReleases().then((rows) => {
      setFeaturedRelease(rows.find((item) => item.status === 'released') || rows[0] || null);
    });
  }, []);

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="overflow-hidden rounded-3xl border border-border bg-surface p-8 shadow-sm">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
                WES
              </div>
              <h1 className="mt-6 text-5xl font-bold tracking-tight text-slate-950 sm:text-6xl">
                Premium public hub for the Artist OS ecosystem.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">{ARTIST_INFO.bio}</p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {publicHubLinks.map((link) => (
                  <a key={link.id} href={link.href} className={`rounded-[1.75rem] border px-5 py-4 ${link.accent}`}>
                    <p className="text-lg font-semibold">{link.label}</p>
                    <p className="mt-1 text-sm opacity-80">{link.description}</p>
                  </a>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-lg">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">Featured release</p>
                {featuredRelease ? (
                  <div className="mt-5">
                    <div className="overflow-hidden rounded-[1.75rem] bg-white/10">
                      {featuredRelease.cover_art_url ? (
                        <img src={featuredRelease.cover_art_url} alt={featuredRelease.title} className="aspect-square w-full object-cover" />
                      ) : (
                        <div className="flex aspect-square items-center justify-center bg-white/5">
                          <Disc3 className="h-16 w-16 text-white/70" />
                        </div>
                      )}
                    </div>
                    <h2 className="mt-5 text-3xl font-bold">{featuredRelease.title}</h2>
                    <p className="mt-2 text-white/70">{featuredRelease.release_date || 'TBD'}</p>
                    <Link to={`/hub/releases/${featuredRelease.id}`} className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950">
                      Open release page
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                ) : (
                  <p className="mt-4 text-white/70">Featured release will appear here once catalog data is available.</p>
                )}
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Stay connected</p>
                <div className="mt-4 flex items-center gap-3 text-sm text-text-secondary">
                  <Mail className="h-4 w-4" />
                  {ARTIST_INFO.email}
                </div>
                <button type="button" className="btn-primary mt-5 w-full">
                  Join Mailing List
                </button>
              </div>

              {authPanel ? (
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-text-tertiary" />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Authorized access</p>
                  </div>
                  <div className="mt-4">{authPanel}</div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
