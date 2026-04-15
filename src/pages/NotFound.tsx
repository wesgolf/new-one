/**
 * 404 Not Found Page
 * Premium, branded error page that matches Artist OS design
 */

import React from 'react';
import { ArrowRight, Music } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="min-h-screen bg-light-bg flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center">
            <Music className="w-10 h-10 text-primary" />
          </div>
        </div>

        {/* Status Code */}
        <div>
          <h1 className="text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            404
          </h1>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Page Not Found</h2>
          <p className="text-text-secondary">
            The track you're looking for has been removed or never existed. Let's get you back on beat.
          </p>
        </div>

        {/* Suggestions */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-text-tertiary uppercase tracking-wide">Popular Destinations</p>
          <div className="grid grid-cols-2 gap-3">
            <NavLink
              to="/"
              className="px-4 py-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <span className="text-sm font-medium text-text-primary group-hover:text-primary transition-colors">
                Command Center
              </span>
            </NavLink>
            <NavLink
              to="/ideas"
              className="px-4 py-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <span className="text-sm font-medium text-text-primary group-hover:text-primary transition-colors">
                Ideas
              </span>
            </NavLink>
            <NavLink
              to="/releases"
              className="px-4 py-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <span className="text-sm font-medium text-text-primary group-hover:text-primary transition-colors">
                Releases
              </span>
            </NavLink>
            <NavLink
              to="/analytics"
              className="px-4 py-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <span className="text-sm font-medium text-text-primary group-hover:text-primary transition-colors">
                Analytics
              </span>
            </NavLink>
          </div>
        </div>

        {/* Primary Action */}
        <NavLink
          to="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg group w-full"
        >
          Back to Dashboard
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </NavLink>

        {/* Footer */}
        <p className="text-xs text-text-tertiary">
          If you believe this is a mistake, reach out to support or check the URL.
        </p>
      </div>
    </div>
  );
}
