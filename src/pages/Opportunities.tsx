import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Mail, 
  Phone, 
  Calendar, 
  MoreVertical, 
  Star, 
  Clock, 
  Tag,
  MessageSquare,
  AlertCircle,
  TrendingUp,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

export function Opportunities() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [isAdding, setIsAdding] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    category: 'Collaborator',
    contact: '',
    status: 'cold',
    relationship_strength: 3,
    tags: [] as string[]
  });

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .order('relationship_strength', { ascending: false });
    if (!error) setContacts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('opportunities').insert([{
      ...newContact,
      user_id: user?.id
    }]);
    if (!error) {
      setIsAdding(false);
      setNewContact({ name: '', category: 'Collaborator', contact: '', status: 'cold', relationship_strength: 3, tags: [] });
      fetchData();
    }
  };

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         c.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || c.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Network & Contacts</h2>
          <p className="text-slate-500 mt-2">Manage your relationships, labels, and collaborators.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="btn-primary flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Add Contact
        </button>
      </header>

      {/* Network Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Network</p>
          <p className="text-2xl font-bold text-slate-900">{contacts.length}</p>
          <div className="mt-2 flex items-center gap-1 text-emerald-600 font-bold text-xs">
            <TrendingUp className="w-3 h-3" />
            +4 this month
          </div>
        </div>
        <div className="glass-card p-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Leads</p>
          <p className="text-2xl font-bold text-slate-900">{contacts.filter(c => c.status === 'active').length}</p>
          <div className="mt-2 flex items-center gap-1 text-blue-600 font-bold text-xs">
            <Clock className="w-3 h-3" />
            2 follow-ups due
          </div>
        </div>
        <div className="glass-card p-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Avg. Strength</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-2xl font-bold text-slate-900">
              {(contacts.reduce((acc, c) => acc + c.relationship_strength, 0) / (contacts.length || 1)).toFixed(1)}
            </p>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className={cn("w-3 h-3", i <= 3 ? "text-amber-400 fill-current" : "text-slate-200")} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, category, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          {['all', 'cold', 'warm', 'active'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                filter === f 
                  ? "bg-blue-600 text-white shadow-md shadow-blue-100" 
                  : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Contacts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContacts.map((contact) => (
          <motion.div
            layout
            key={contact.id}
            className="glass-card p-6 group hover:border-blue-200 transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-xl font-bold text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                  {contact.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{contact.name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{contact.category}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star 
                      key={i} 
                      className={cn(
                        "w-3 h-3 transition-all", 
                        i <= contact.relationship_strength ? "text-amber-400 fill-current" : "text-slate-200"
                      )} 
                    />
                  ))}
                </div>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest",
                  contact.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                  contact.status === 'warm' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-500'
                )}>
                  {contact.status}
                </span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {contact.contact || 'No email provided'}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Last contact: {contact.last_contact || 'Never'}
              </div>
              {contact.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {contact.tags.map((tag: string) => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[8px] font-bold uppercase tracking-widest">
                      <Tag className="w-2 h-2" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button className="py-2 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                <MessageSquare className="w-3 h-3" />
                Message
              </button>
              <button className="py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                <MoreVertical className="w-3 h-3" />
                Details
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add Contact Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900">Add New Contact</h3>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                  <input
                    required
                    type="text"
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="e.g. John Smith"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</label>
                    <select
                      value={newContact.category}
                      onChange={(e) => setNewContact({ ...newContact, category: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                      <option>Venue</option>
                      <option>Label</option>
                      <option>Promoter</option>
                      <option>Collaborator</option>
                      <option>Playlist</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</label>
                    <select
                      value={newContact.status}
                      onChange={(e) => setNewContact({ ...newContact, status: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                      <option value="cold">Cold</option>
                      <option value="warm">Warm</option>
                      <option value="active">Active Lead</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email / Contact Info</label>
                  <input
                    type="text"
                    value={newContact.contact}
                    onChange={(e) => setNewContact({ ...newContact, contact: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="email@example.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Relationship Strength (1-5)</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setNewContact({ ...newContact, relationship_strength: i })}
                        className={cn(
                          "flex-1 py-2 rounded-xl border transition-all",
                          newContact.relationship_strength === i 
                            ? "bg-amber-50 border-amber-200 text-amber-600" 
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        )}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" className="btn-primary w-full py-3 mt-4">
                  Add to Network
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  );
}
