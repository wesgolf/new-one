import React from 'react';
import { X, Plus, Settings2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Platform, PlatformSettings } from '../types';
import { platformSettingsRegistry, getSettingGroups, SettingField } from '../platformSettingsRegistry';

interface PlatformSettingsFormProps {
  platform: Platform;
  settings: PlatformSettings;
  onChange: (settings: PlatformSettings) => void;
}

function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = React.useState('');

  const addTag = () => {
    const tag = input.trim();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
      setInput('');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {(value || []).map((tag, i) => (
          <span key={i} className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold flex items-center gap-1.5 border border-blue-100">
            {tag}
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="hover:text-blue-800">
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
          placeholder={placeholder}
          className="flex-1 bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <button type="button" onClick={addTag} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function FieldRenderer({ field, value, onChange }: { field: SettingField; value: any; onChange: (v: any) => void }) {
  switch (field.type) {
    case 'text':
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      );
    case 'textarea':
      return (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
        />
      );
    case 'select':
      return (
        <select
          value={value || field.defaultValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    case 'toggle':
      return (
        <div className="flex items-center justify-between">
          <div>
            {field.description && (
              <p className="text-[10px] text-slate-400 mt-0.5">{field.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onChange(!value)}
            className={cn(
              "w-10 h-5 rounded-full transition-all relative shrink-0",
              value ? "bg-blue-600" : "bg-slate-200"
            )}
          >
            <div className={cn(
              "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
              value ? "left-6" : "left-1"
            )} />
          </button>
        </div>
      );
    case 'tags':
      return <TagInput value={value || []} onChange={onChange} placeholder={field.placeholder} />;
    case 'number':
      return (
        <input
          type="number"
          value={value || 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      );
    default:
      return null;
  }
}

export function PlatformSettingsForm({ platform, settings, onChange }: PlatformSettingsFormProps) {
  const config = platformSettingsRegistry[platform];
  if (!config) return null;

  const groups = getSettingGroups(platform);

  const updateField = (key: string, value: any) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Settings2 className="w-4 h-4 text-blue-600" />
        <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">{config.label}</h4>
      </div>

      {groups.map((group) => {
        const groupFields = config.fields.filter((f) => f.group === group);
        if (groupFields.length === 0) return null;

        return (
          <div key={group} className="space-y-3">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">{group}</p>
            {groupFields.map((field) => (
              <div key={field.key} className="space-y-1">
                {field.type !== 'toggle' && (
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{field.label}</label>
                )}
                {field.type === 'toggle' && (
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{field.label}</label>
                )}
                <FieldRenderer
                  field={field}
                  value={settings[field.key] ?? field.defaultValue}
                  onChange={(v) => updateField(field.key, v)}
                />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
