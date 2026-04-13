import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Tag, 
  FileText,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Search,
  MoreVertical,
  Trash2,
  Edit2,
  Download,
  Music
} from 'lucide-react';
import { FinanceTransaction, FinanceSummary, Release } from '../types';
import { useArtistData } from '../hooks/useArtistData';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

const categories = [
  'Streaming', 'Merch', 'Live', 'Royalties', 'Production', 'Marketing', 'Equipment', 'Software', 'Other'
];

export function Finance() {
  const { data: transactions, loading, addItem, deleteItem } = useArtistData<FinanceTransaction>('finance');
  const { data: releases } = useArtistData<Release>('releases');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const summary = useMemo(() => {
    const s: FinanceSummary = {
      total_income: 0,
      total_expenses: 0,
      net_profit: 0,
      by_category: {}
    };

    transactions.forEach(t => {
      const amount = Number(t.amount);
      if (t.type === 'income') {
        s.total_income += amount;
      } else {
        s.total_expenses += amount;
      }
      
      s.by_category[t.category] = (s.by_category[t.category] || 0) + amount;
    });

    s.net_profit = s.total_income - s.total_expenses;
    return s;
  }, [transactions]);

  const filteredTransactions = transactions.filter(t => {
    if (filter !== 'all' && t.type !== filter) return false;
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    return true;
  });

  const handleAddTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newTransaction = {
      date: formData.get('date') as string,
      description: formData.get('description') as string,
      amount: Number(formData.get('amount')),
      type: formData.get('type') as 'income' | 'expense',
      category: formData.get('category') as any,
      notes: formData.get('notes') as string,
      linked_release_id: (formData.get('linked_release_id') as string) || null,
    };

    await addItem(newTransaction);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-10">
      <header className="flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">Finance Hub</h2>
          <p className="text-slate-500 mt-2">Track your revenue, expenses, and career profitability.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary shadow-lg shadow-blue-200"
        >
          <Plus className="w-4 h-4" />
          Add Transaction
        </button>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="w-24 h-24 text-emerald-500" />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Income</p>
          <h3 className="text-4xl font-bold text-emerald-600">${summary.total_income.toLocaleString()}</h3>
          <div className="mt-4 flex items-center gap-2 text-emerald-600 font-bold text-sm">
            <ArrowUpRight className="w-4 h-4" />
            <span>Lifetime Revenue</span>
          </div>
        </div>

        <div className="glass-card p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingDown className="w-24 h-24 text-rose-500" />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Expenses</p>
          <h3 className="text-4xl font-bold text-rose-600">${summary.total_expenses.toLocaleString()}</h3>
          <div className="mt-4 flex items-center gap-2 text-rose-600 font-bold text-sm">
            <ArrowDownRight className="w-4 h-4" />
            <span>Career Investment</span>
          </div>
        </div>

        <div className="glass-card p-8 relative overflow-hidden group bg-slate-900 text-white border-none shadow-2xl shadow-slate-200">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign className="w-24 h-24 text-blue-400" />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Net Profit</p>
          <h3 className={cn(
            "text-4xl font-bold",
            summary.net_profit >= 0 ? "text-blue-400" : "text-rose-400"
          )}>
            ${summary.net_profit.toLocaleString()}
          </h3>
          <div className="mt-4 flex items-center gap-2 text-slate-400 font-bold text-sm">
            <PieChart className="w-4 h-4" />
            <span>Profitability Ratio</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
          {['all', 'income', 'expense'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                filter === f 
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" 
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 w-full lg:w-auto">
          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
          >
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Amount</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-medium text-slate-600">{new Date(t.date).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{t.description}</p>
                    {t.linked_release_id && (
                      <div className="flex items-center gap-1 mt-1">
                        <Music className="w-3 h-3 text-blue-500" />
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                          {releases.find(r => r.id === t.linked_release_id)?.title || 'Linked Release'}
                        </span>
                      </div>
                    )}
                    {t.notes && <p className="text-xs text-slate-400 mt-0.5">{t.notes}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-widest">
                      {t.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={cn(
                      "text-sm font-bold",
                      t.type === 'income' ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {t.type === 'income' ? '+' : '-'}${Number(t.amount).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteItem(t.id)}
                        className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center">
                        <FileText className="w-8 h-8 text-slate-200" />
                      </div>
                      <p className="text-slate-500 font-medium">No transactions found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Add Transaction</h3>
            <form onSubmit={handleAddTransaction} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Type</label>
                  <select name="type" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Category</label>
                  <select name="category" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Description</label>
                <input 
                  name="description"
                  type="text" 
                  required
                  placeholder="e.g. Spotify Royalties, New Synth, Studio Rent"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Amount ($)</label>
                  <input 
                    name="amount"
                    type="number" 
                    step="0.01"
                    required
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Date</label>
                  <input 
                    name="date"
                    type="date" 
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Linked Release (Optional)</label>
                <select name="linked_release_id" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                  <option value="">None</option>
                  {releases.map(r => (
                    <option key={r.id} value={r.id}>{r.title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Notes (Optional)</label>
                <textarea 
                  name="notes"
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors shadow-lg shadow-blue-200"
                >
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
