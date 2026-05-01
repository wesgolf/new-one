import React from 'react';

export function SchemaPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl rounded-[2rem] border border-dashed border-border bg-white p-10 text-center shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">Schema Reset</p>
      <h1 className="mt-3 text-3xl font-bold text-text-primary">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-text-secondary">{description}</p>
    </div>
  );
}
