/**
 * useDashboard – typed single-fetch hook that drives the entire Command Center.
 *
 * Returns all data needed by dashboard cards plus helpers for:
 *   – since-last-login diff
 *   – today's priorities
 *   – upcoming content
 *   – active campaigns
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DashboardData {
  releases: any[];
  content: any[];
  todos: any[];
  goals: any[];
  shows: any[];
  meetings: any[];
  opportunities: any[];

  /** delta since last login */
  sinceLastLogin: SinceLastLoginDelta;

  /** today's actionable items */
  todayPriorities: TodayItem[];

  /** next N scheduled posts / events */
  upcomingItems: UpcomingItem[];

  /** releases in active campaign phase */
  activeCampaigns: CampaignItem[];
}

export interface SinceLastLoginDelta {
  newIdeas: number;
  newTasks: number;
  newEvents: number;
  releaseChanges: number;
  newContent: number;
  lastLoginAt: Date | null;
  items: SinceLastLoginItem[];
}

export interface SinceLastLoginItem {
  type: 'idea' | 'task' | 'event' | 'release' | 'content';
  title: string;
  detail?: string;
  at: string;
}

export interface TodayItem {
  id: string;
  type: 'task' | 'post' | 'error' | 'deadline' | 'release';
  title: string;
  detail?: string;
  priority: 'high' | 'medium' | 'low';
  platform?: string;
  /** ISO date/time */
  at?: string;
}

export interface UpcomingItem {
  id: string;
  title: string;
  platform?: string;
  type: string;
  scheduledAt: string;
  status: string;
  coverUrl?: string;
}

export interface CampaignItem {
  id: string;
  title: string;
  status: string;
  coverUrl?: string;
  releaseDate?: string;
  assetsTotal: number;
  assetsReady: number;
  nextMilestone?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const LAST_LOGIN_KEY = 'artist_os_last_login';

function getLastLoginAt(): Date | null {
  const stored = localStorage.getItem(LAST_LOGIN_KEY);
  return stored ? new Date(stored) : null;
}

export function stampLoginTime() {
  localStorage.setItem(LAST_LOGIN_KEY, new Date().toISOString());
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const lastLoginAt = getLastLoginAt();
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      const [
        releasesRes,
        contentRes,
        todosRes,
        goalsRes,
        showsRes,
        meetingsRes,
        opportunitiesRes,
      ] = await Promise.allSettled([
        supabase.from('releases').select('*').order('created_at', { ascending: false }),
        supabase.from('content_items').select('*').order('scheduled_date', { ascending: true }),
        supabase.from('todos').select('*').order('due_date', { ascending: true }),
        supabase.from('goals').select('*'),
        supabase.from('shows').select('*').order('date', { ascending: true }),
        supabase.from('meetings').select('*').order('date', { ascending: true }),
        supabase.from('opportunities').select('*'),
      ]);

      const releases: any[] = releasesRes.status === 'fulfilled' ? releasesRes.value.data ?? [] : [];
      const content: any[] = contentRes.status === 'fulfilled' ? contentRes.value.data ?? [] : [];
      const todos: any[] = todosRes.status === 'fulfilled' ? todosRes.value.data ?? [] : [];
      const goals: any[] = goalsRes.status === 'fulfilled' ? goalsRes.value.data ?? [] : [];
      const shows: any[] = showsRes.status === 'fulfilled' ? showsRes.value.data ?? [] : [];
      const meetings: any[] = meetingsRes.status === 'fulfilled' ? meetingsRes.value.data ?? [] : [];
      const opportunities: any[] = opportunitiesRes.status === 'fulfilled' ? opportunitiesRes.value.data ?? [] : [];

      // ── Since Last Login ──────────────────────────────────────────────────
      const sinceItems: SinceLastLoginItem[] = [];
      const since = lastLoginAt ?? new Date(0);

      const newIdeas = (content as any[]).filter(c => c.status === 'idea' && new Date(c.created_at) > since);
      const newTasks = (todos as any[]).filter(t => new Date(t.created_at ?? '0') > since);
      const newEvents = [
        ...(shows as any[]).filter(s => new Date(s.created_at ?? '0') > since),
        ...(meetings as any[]).filter(m => new Date(m.created_at ?? '0') > since),
      ];
      const changedReleases = (releases as any[]).filter(r => new Date(r.updated_at ?? '0') > since);
      const newContent = (content as any[]).filter(c => c.status !== 'idea' && new Date(c.created_at) > since);

      newIdeas.slice(0, 5).forEach(i => sinceItems.push({ type: 'idea', title: i.title, at: i.created_at }));
      newTasks.slice(0, 5).forEach(t => sinceItems.push({ type: 'task', title: t.task, at: t.created_at ?? '' }));
      newEvents.slice(0, 3).forEach(e => sinceItems.push({ type: 'event', title: e.venue ?? e.title, at: e.created_at ?? '' }));
      changedReleases.slice(0, 3).forEach(r => sinceItems.push({ type: 'release', title: r.title, detail: r.status, at: r.updated_at ?? '' }));
      newContent.slice(0, 3).forEach(c => sinceItems.push({ type: 'content', title: c.title, detail: c.platform, at: c.created_at ?? '' }));

      sinceItems.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

      const sinceLastLogin: SinceLastLoginDelta = {
        newIdeas: newIdeas.length,
        newTasks: newTasks.length,
        newEvents: newEvents.length,
        releaseChanges: changedReleases.length,
        newContent: newContent.length,
        lastLoginAt,
        items: sinceItems.slice(0, 12),
      };

      // ── Today's Priorities ───────────────────────────────────────────────
      const todayPriorities: TodayItem[] = [];

      // Due today or overdue tasks
      (todos as any[])
        .filter(t => !t.completed && t.due_date && t.due_date <= todayStr)
        .forEach(t => todayPriorities.push({
          id: t.id,
          type: 'task',
          title: t.task,
          priority: t.priority ?? 'medium',
          at: t.due_date,
        }));

      // Posts scheduled today
      (content as any[])
        .filter(c => c.scheduled_date?.startsWith(todayStr) && ['scheduled', 'ready'].includes(c.status))
        .forEach(c => todayPriorities.push({
          id: c.id,
          type: 'post',
          title: c.title,
          detail: c.platform,
          priority: 'high',
          platform: c.platform,
          at: c.scheduled_date,
        }));

      // Failed posts
      (content as any[])
        .filter(c => c.status === 'failed')
        .forEach(c => todayPriorities.push({
          id: c.id,
          type: 'error',
          title: `Failed post: ${c.title}`,
          detail: c.platform,
          priority: 'high',
          platform: c.platform,
        }));

      // Release deadlines today
      (releases as any[])
        .filter(r => {
          const rd = r.distribution?.release_date || r.release_date;
          return rd && rd === todayStr;
        })
        .forEach(r => todayPriorities.push({
          id: r.id,
          type: 'release',
          title: `Release day: ${r.title}`,
          priority: 'high',
          at: r.distribution?.release_date ?? r.release_date,
        }));

      // Sort: high → medium → low
      const pri = { high: 0, medium: 1, low: 2 };
      todayPriorities.sort((a, b) => pri[a.priority] - pri[b.priority]);

      // ── Upcoming Content ─────────────────────────────────────────────────
      const upcomingItems: UpcomingItem[] = [
        ...(content as any[])
          .filter(c => c.scheduled_date && c.scheduled_date > now.toISOString())
          .slice(0, 6)
          .map(c => ({
            id: c.id,
            title: c.title,
            platform: c.platform,
            type: c.type ?? 'Post',
            scheduledAt: c.scheduled_date,
            status: c.status,
            coverUrl: undefined,
          })),
        ...(shows as any[])
          .filter(s => s.date >= todayStr)
          .slice(0, 3)
          .map(s => ({
            id: s.id,
            title: s.venue,
            platform: 'Show',
            type: 'Show',
            scheduledAt: s.date,
            status: s.status ?? 'upcoming',
          })),
      ]
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
        .slice(0, 8);

      // ── Active Campaigns ─────────────────────────────────────────────────
      const activeCampaigns: CampaignItem[] = (releases as any[])
        .filter(r => ['scheduled', 'ready', 'production', 'mastered'].includes(r.status))
        .slice(0, 4)
        .map(r => {
          const assets = r.assets ?? {};
          const total = 5; // cover art, teaser, waveform, caption, hashtags
          let ready = 0;
          if (assets.cover_art_url) ready++;
          if ((assets.teaser_clip_urls ?? []).length > 0) ready++;
          if (assets.waveform_video_url) ready++;
          if (r.marketing?.caption_templates?.length > 0) ready++;
          if (r.marketing?.hashtags?.length > 0) ready++;

          const rd = r.distribution?.release_date ?? r.release_date;
          const daysUntil = rd ? Math.ceil((new Date(rd).getTime() - now.getTime()) / 86400000) : null;
          const nextMilestone = daysUntil !== null
            ? daysUntil <= 0 ? 'Release day' : `${daysUntil}d to drop`
            : undefined;

          return {
            id: r.id,
            title: r.title,
            status: r.status,
            coverUrl: assets.cover_art_url,
            releaseDate: rd,
            assetsTotal: total,
            assetsReady: ready,
            nextMilestone,
          };
        });

      // Stamp new login time now that we've got the diff
      stampLoginTime();

      setData({
        releases,
        content,
        todos,
        goals,
        shows,
        meetings,
        opportunities,
        sinceLastLogin,
        todayPriorities,
        upcomingItems,
        activeCampaigns,
      });
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
