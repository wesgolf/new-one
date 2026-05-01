import React, { useCallback, useEffect, useState } from 'react';
import { ExternalLink, FileText, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

type ReportRow = {
  id: string;
  user_id: string;
  report_date: string;
  start_date: string | null;
  end_date: string | null;
  sessions_included: string[] | null;
  linked_report_pdf: string | null;
  report_content: string | null;
  title: string;
  created_at: string;
  updated_at: string;
};

export function Reports() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        setReports([]);
        return;
      }

      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', userId)
        .order('report_date', { ascending: false });

      if (error) throw error;
      setReports((data ?? []) as ReportRow[]);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">Reports</p>
          <h1 className="mt-2 text-4xl font-bold text-text-primary">Saved Reports</h1>
          <p className="mt-2 max-w-2xl text-text-secondary">
            This page reads the new `reports` table directly.
          </p>
        </div>
        <button type="button" onClick={() => void load()} className="btn-secondary">
          Refresh
        </button>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-text-tertiary" />
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center text-text-secondary">
          No reports saved yet.
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {reports.map((report) => (
            <article key={report.id} className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-text-tertiary" />
                    <h2 className="text-xl font-semibold text-text-primary">{report.title}</h2>
                  </div>
                  <p className="mt-2 text-sm text-text-secondary">
                    Generated {new Date(report.report_date).toLocaleString()}
                  </p>
                  {(report.start_date || report.end_date) && (
                    <p className="mt-1 text-sm text-text-secondary">
                      Range: {report.start_date || '—'} → {report.end_date || '—'}
                    </p>
                  )}
                </div>
                {report.linked_report_pdf && (
                  <a
                    href={report.linked_report_pdf}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-black px-3 py-2 text-sm font-semibold text-white"
                  >
                    <ExternalLink className="h-4 w-4" />
                    PDF
                  </a>
                )}
              </div>

              {report.sessions_included && report.sessions_included.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {report.sessions_included.map((section) => (
                    <span key={section} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                      {section}
                    </span>
                  ))}
                </div>
              )}

              {report.report_content && (
                <div className="mt-5 rounded-xl border border-border bg-slate-50 px-4 py-3">
                  <p className="whitespace-pre-wrap text-sm text-text-secondary">
                    {report.report_content.slice(0, 600)}
                    {report.report_content.length > 600 ? '…' : ''}
                  </p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
