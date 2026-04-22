import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Brain,
  CheckCircle2,
  Database,
  ExternalLink,
  FileText,
  Globe,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

interface Resource {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'image' | 'webpage' | 'pdf';
  url?: string;
  category: string;
}

export function ArtistCoach() {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('artist_coach_messages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved messages', e);
      }
    }
    return [
      { 
        role: 'assistant', 
        content: "Hello! I'm your Artist Coach. I've analyzed your current projects, releases, and goals. How can I help you grow your career today?" 
      }
    ];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isAddingResource, setIsAddingResource] = useState(false);
  const [newResource, setNewResource] = useState({ 
    title: '', 
    content: '', 
    category: 'General',
    type: 'text' as 'text' | 'image' | 'webpage' | 'pdf',
    url: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'knowledge'>('chat');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchResources();
  }, []);

  useEffect(() => {
    localStorage.setItem('artist_coach_messages', JSON.stringify(messages));
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const clearChatHistory = () => {
    if (window.confirm('Are you sure you want to clear your chat history?')) {
      setMessages([
        { 
          role: 'assistant', 
          content: "Hello! I'm your Artist Coach. I've analyzed your current projects, releases, and goals. How can I help you grow your career today?" 
        }
      ]);
      localStorage.removeItem('artist_coach_messages');
    }
  };

  const fetchResources = async () => {
    const { data } = await supabase.from('bot_resources').select('*').order('created_at', { ascending: false });
    if (data) setResources(data);
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsUploading(true);
    let finalUrl = newResource.url;

    try {
      if (selectedFile && (newResource.type === 'image' || newResource.type === 'pdf')) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('bot_resources')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('bot_resources')
          .getPublicUrl(filePath);
        
        finalUrl = publicUrl;
      }

      const { error } = await supabase.from('bot_resources').insert([{
        ...newResource,
        url: finalUrl,
        user_id: user.id
      }]);

      if (!error) {
        setNewResource({ 
          title: '', 
          content: '', 
          category: 'General',
          type: 'text',
          url: ''
        });
        setSelectedFile(null);
        setIsAddingResource(false);
        fetchResources();
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload resource. Make sure you have a "bot_resources" storage bucket created in Supabase.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      // Auto-detect type
      if (file.type.startsWith('image/')) setNewResource(prev => ({ ...prev, type: 'image' }));
      else if (file.type === 'application/pdf') setNewResource(prev => ({ ...prev, type: 'pdf' }));
    }
  };

  const handleDeleteResource = async (id: string) => {
    const { error } = await supabase.from('bot_resources').delete().eq('id', id);
    if (!error) fetchResources();
  };

  const getContext = async () => {
    // Fetch all relevant context for the bot
    const [
      releases,
      content,
      shows,
      goals,
      opportunities,
      todos,
      kb
    ] = await Promise.all([
      supabase.from('releases').select('*'),
      supabase.from('content_items').select('*'),
      supabase.from('shows').select('*'),
      supabase.from('goals').select('*'),
      supabase.from('opportunities').select('*'),
      supabase.from('todos').select('*'),
      supabase.from('bot_resources').select('*')
    ]);

    let context = "USER DATA CONTEXT:\n\n";

    if (releases.data?.length) {
      context += "RELEASES:\n" + releases.data.map(r => `- ${r.title} (Status: ${r.status}, Date: ${r.release_date})`).join('\n') + "\n\n";
    }
    if (content.data?.length) {
      context += "CONTENT STRATEGY:\n" + content.data.map(c => `- ${c.title} on ${c.platform} (Status: ${c.status}, Type: ${c.type})`).join('\n') + "\n\n";
    }
    if (goals.data?.length) {
      context += "GOALS:\n" + goals.data.map(g => `- ${g.title}: ${g.current}/${g.target} ${g.unit} (Deadline: ${g.deadline})`).join('\n') + "\n\n";
    }
    if (opportunities.data?.length) {
      context += "OPPORTUNITIES:\n" + opportunities.data.map(o => `- ${o.name} (${o.category}, Status: ${o.status})`).join('\n') + "\n\n";
    }
    if (kb.data?.length) {
      context += "ARTIST KNOWLEDGE BASE (RESOURCES):\n" + kb.data.map(r => {
        let text = `[Source: ${r.title}] Type: ${r.type}. `;
        if (r.type === 'text') text += r.content;
        else if (r.url) text += `URL: ${r.url}. Description: ${r.content}`;
        return text;
      }).join('\n') + "\n\n";
    }

    return context;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const context = await getContext();
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      
      const systemInstruction = `
        You are the "Artist OS Coach", a highly strategic and supportive AI mentor for independent music artists.
        Your goal is to help the artist grow their career, manage their releases, and optimize their content strategy.
        
        CRITICAL RULES:
        1. ALWAYS use the provided USER DATA CONTEXT to personalize your advice.
        2. ALWAYS cite your sources from the context (e.g., "Based on your goal for 10k streams..." or "According to your resource 'Marketing Strategy'...").
        3. Be concise, professional, and encouraging.
        4. If the artist asks for a plan, create a structured step-by-step guide.
        5. If you see a release coming up, offer specific promotional advice.
        6. Use Markdown for formatting.
        
        ${context}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          ...messages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      const aiContent = response.text || "I'm sorry, I couldn't process that request.";
      setMessages(prev => [...prev, { role: 'assistant', content: aiContent }]);
    } catch (err) {
      console.error('AI Error:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error connecting to my brain. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col gap-6">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Coach</h2>
          <p className="mt-1 text-slate-500">AI mentorship trained on your career data.</p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Tab switcher */}
          <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setActiveTab('chat')}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all',
                activeTab === 'chat'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Chat
            </button>
            <button
              onClick={() => setActiveTab('knowledge')}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all',
                activeTab === 'knowledge'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <Database className="h-3.5 w-3.5" />
              Knowledge
            </button>
          </div>

          {/* Clear history — chat tab only */}
          {activeTab === 'chat' && (
            <button
              onClick={clearChatHistory}
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-500 shadow-sm transition-colors hover:border-rose-200 hover:text-rose-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>
      </header>

      {/* ── Main panel ─────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">

        {/* ── Chat tab ──────────────────────────────────────────────── */}
        {activeTab === 'chat' && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div
              ref={scrollRef}
              className="min-h-0 flex-1 overflow-y-auto space-y-6 p-6"
            >
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex max-w-[88%] gap-3 md:gap-4',
                    msg.role === 'user' ? 'ml-auto flex-row-reverse' : '',
                  )}
                >
                  {/* Avatar */}
                  <div className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-sm',
                    msg.role === 'assistant' ? 'bg-slate-100' : 'bg-slate-900',
                  )}>
                    {msg.role === 'assistant'
                      ? <Brain className="h-4 w-4 text-slate-600" />
                      : <MessageSquare className="h-4 w-4 text-white" />
                    }
                  </div>

                  {/* Bubble */}
                  <div className={cn(
                    'rounded-2xl p-4 text-sm leading-relaxed',
                    msg.role === 'assistant'
                      ? 'rounded-tl-none border border-slate-100 bg-slate-50 text-slate-800'
                      : 'rounded-tr-none bg-slate-900 text-white shadow-md',
                  )}>
                    <div className="prose prose-sm max-w-none prose-slate">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100">
                    <Brain className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="flex h-12 w-28 items-center justify-center rounded-2xl rounded-tl-none border border-slate-100 bg-slate-50">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={handleSendMessage}
              className="border-t border-slate-100 bg-white p-4"
            >
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask your coach anything…"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-5 pr-14 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-slate-900 p-2.5 text-white shadow transition-colors hover:bg-blue-600 disabled:opacity-40 disabled:hover:bg-slate-900"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Knowledge tab ─────────────────────────────────────────── */}
        {activeTab === 'knowledge' && (
          <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BookOpen className="h-4.5 w-4.5 text-slate-400" />
                <h3 className="text-base font-bold text-slate-900">Knowledge Base</h3>
                {resources.length > 0 && (
                  <span className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                    {resources.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsAddingResource(true)}
                className="btn-primary py-2 px-4 text-xs"
              >
                <Plus className="h-4 w-4" />
                Add resource
              </button>
            </div>

            {resources.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 py-20 text-center">
                <Database className="mb-4 h-10 w-10 text-slate-200" />
                <p className="font-medium text-slate-500">No resources yet.</p>
                <p className="mt-1 text-xs text-slate-400">Add notes or links to train the coach on your strategy.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {resources.map((resource) => (
                  <div
                    key={resource.id}
                    className="group relative flex flex-col rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          {resource.category}
                        </span>
                        <div className="flex h-5 w-5 items-center justify-center rounded-md border border-slate-100 bg-white">
                          {resource.type === 'image'   && <ImageIcon  className="h-3 w-3 text-slate-400" />}
                          {resource.type === 'webpage' && <Globe      className="h-3 w-3 text-slate-400" />}
                          {(resource.type === 'text' || resource.type === 'pdf') && <FileText className="h-3 w-3 text-slate-400" />}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {resource.url && (
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:text-blue-600"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => handleDeleteResource(resource.id)}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className="font-bold text-slate-900">{resource.title}</h4>

                    {resource.type === 'image' && resource.url && (
                      <div className="my-3 aspect-video overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                        <img
                          src={resource.url}
                          alt={resource.title}
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-500">
                      {resource.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Add Resource Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {isAddingResource && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <h3 className="text-lg font-bold text-slate-900">Add knowledge resource</h3>
                <button
                  onClick={() => setIsAddingResource(false)}
                  className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddResource} className="space-y-4 p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Title</label>
                    <input
                      required
                      type="text"
                      value={newResource.title}
                      onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                      placeholder="e.g. 2025 Marketing Strategy"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Category</label>
                    <select
                      value={newResource.category}
                      onChange={(e) => setNewResource({ ...newResource, category: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                      <option>Strategy</option>
                      <option>Technical</option>
                      <option>Inspiration</option>
                      <option>Marketing</option>
                      <option>General</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Type</label>
                  <div className="grid grid-cols-4 gap-2">
                    {([
                      { id: 'text',    icon: FileText,   label: 'Text'  },
                      { id: 'image',   icon: ImageIcon,  label: 'Image' },
                      { id: 'webpage', icon: Globe,      label: 'Web'   },
                      { id: 'pdf',     icon: FileText,   label: 'PDF'   },
                    ] as const).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setNewResource({ ...newResource, type: t.id })}
                        className={cn(
                          'flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all',
                          newResource.type === t.id
                            ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                            : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200',
                        )}
                      >
                        <t.icon className="h-4 w-4" />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {(newResource.type === 'image' || newResource.type === 'pdf') && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Upload file</label>
                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      className={cn(
                        'relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 transition-all',
                        dragActive    ? 'border-blue-400 bg-blue-50'    : 'border-slate-200 bg-slate-50',
                        selectedFile  ? 'border-emerald-400 bg-emerald-50' : '',
                      )}
                    >
                      <input
                        type="file"
                        onChange={(e) => e.target.files && setSelectedFile(e.target.files[0])}
                        className="absolute inset-0 cursor-pointer opacity-0"
                        accept={newResource.type === 'image' ? 'image/*' : 'application/pdf'}
                      />
                      {selectedFile ? (
                        <>
                          <div className="rounded-xl bg-emerald-500 p-3">
                            <CheckCircle2 className="h-6 w-6 text-white" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-slate-900">{selectedFile.name}</p>
                            <p className="text-[10px] uppercase tracking-widest text-slate-400">File selected</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="rounded-xl bg-white p-3 shadow-sm">
                            <Upload className="h-6 w-6 text-slate-400" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-slate-900">Click or drag to upload</p>
                            <p className="text-[10px] uppercase tracking-widest text-slate-400">
                              {newResource.type === 'image' ? 'PNG, JPG, GIF' : 'PDF only'}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {newResource.type === 'webpage' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">URL</label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        required
                        type="url"
                        value={newResource.url}
                        onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                        placeholder="https://…"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {newResource.type === 'text' ? 'Content' : 'Notes / description'}
                  </label>
                  <textarea
                    required={newResource.type === 'text'}
                    rows={4}
                    value={newResource.content}
                    onChange={(e) => setNewResource({ ...newResource, content: e.target.value })}
                    placeholder={newResource.type === 'text' ? 'Paste your notes here…' : 'Add context for the coach…'}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUploading}
                  className="btn-primary w-full py-3"
                >
                  {isUploading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
                  ) : (
                    'Save to knowledge base'
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

