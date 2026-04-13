import React, { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { NavLink } from 'react-router-dom';

export function FinanceWidget() {
  const [summary, setSummary] = useState({ income: 0, expense: 0, net: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFinance() {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from('finance')
        .select('*')
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

      if (!error && data) {
        const income = data.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
        const expense = data.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
        setSummary({ income, expense, net: income - expense });
      }
      setLoading(false);
    }
    fetchFinance();
  }, []);

  return (
    <div className="glass-card p-6 group hover:border-emerald-200 transition-all">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-xl">
            <Wallet className="w-5 h-5 text-emerald-600" />
          </div>
          <h3 className="font-bold text-slate-900">Monthly Cashflow</h3>
        </div>
        <NavLink to="/finance" className="p-1.5 hover:bg-slate-50 rounded-lg transition-colors">
          <ArrowUpRight className="w-4 h-4 text-slate-400" />
        </NavLink>
      </div>

      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Net Profit</p>
            <p className={`text-2xl font-bold ${summary.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {summary.net >= 0 ? '+' : ''}${Math.abs(summary.net).toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Last 30 Days</p>
            <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
              <TrendingUp className="w-3 h-3" />
              12%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
              <TrendingUp className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Income</span>
            </div>
            <p className="text-sm font-bold text-slate-900">${summary.income.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-1.5 text-rose-600 mb-1">
              <TrendingDown className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Expenses</span>
            </div>
            <p className="text-sm font-bold text-slate-900">${summary.expense.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
