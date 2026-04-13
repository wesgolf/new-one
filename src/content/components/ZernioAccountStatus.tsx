import React from 'react';
import { Shield, CheckCircle2, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import { zernioAdapter } from '../services/zernioAdapter';
import { Platform } from '../types';

interface ZernioAccount {
  id: string;
  platform: string;
  name?: string;
  avatar_url?: string;
  status: string;
}

export function ZernioAccountStatus() {
  const [accounts, setAccounts] = React.useState<ZernioAccount[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [config, setConfig] = React.useState<{ hasKey: boolean; baseUrl: string } | null>(null);

  const loadAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const configData = await zernioAdapter.configCheck();
      const hasKey = !configData.error;
      setConfig({ hasKey, baseUrl: 'https://zernio.com/api/v1' });
      
      if (!hasKey) {
        setError('Zernio API Key is missing or invalid. Please set VITE_ZERNIO_API_KEY in your environment.');
        setAccounts([]);
      } else {
        const accountsData = await zernioAdapter.fetchAccounts().catch(() => []);
        setAccounts(accountsData);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadAccounts();
  }, []);

  if (loading) {
    return (
      <div className="glass-card p-4 flex items-center justify-center min-h-[100px]">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Zernio Connectivity</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Connected Social Profiles</p>
          </div>
        </div>
        <button 
          onClick={loadAccounts}
          className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="p-3 bg-red-50 rounded-xl flex flex-col gap-2 text-red-600">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs font-bold">{error}</span>
          </div>
          {config && !config.hasKey && (
            <p className="text-[10px] font-medium ml-7">
              Go to Settings {'>'} Environment Variables to add your Zernio API Key.
            </p>
          )}
        </div>
      ) : accounts.length === 0 ? (
        <div className="p-4 border-2 border-dashed border-slate-100 rounded-2xl text-center space-y-2">
          <p className="text-xs font-bold text-slate-400">No accounts connected to Zernio yet.</p>
          <a 
            href="https://zernio.com/dashboard" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
          >
            Connect in Zernio <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {accounts.map(account => (
            <div key={account.id} className="p-3 bg-slate-50 rounded-xl flex flex-col items-center gap-2 text-center border border-slate-100">
              <div className="relative">
                {account.avatar_url ? (
                  <img src={account.avatar_url} alt={account.name} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-400 text-xs font-bold">
                    {account.name ? account.name.charAt(0) : '?'}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-black text-slate-900 truncate max-w-[80px]">{account.name}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{account.platform}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
