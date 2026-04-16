import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function NotFound() {
  return (
    <div className="min-h-[72vh] flex flex-col items-center justify-center px-4 text-center select-none">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand mb-5">404</p>
      <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-text-primary leading-none mb-5">
        Wrong frequency.
      </h1>
      <p className="text-text-muted text-base max-w-xs mb-10 leading-relaxed">
        This page doesn’t exist or was moved. Let’s get you back to the studio.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-text-primary text-white rounded-xl text-sm font-semibold hover:opacity-75 transition-opacity"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Hub
      </Link>
    </div>
  );
}
