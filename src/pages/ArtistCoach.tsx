import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  Plus, 
  Trash2, 
  BookOpen, 
  MessageSquare, 
  Loader2, 
  Sparkles, 
  Database, 
  History,
  Zap,
  Brain,
  Search,
  Info,
  X,
  Globe,
  Link as LinkIcon,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Upload,
  File,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { getCurrentAuthUser } from '../lib/auth';
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
    const user = await getCurrentAuthUser();
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
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
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
        model: "gemini-3-flash-preview",
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
    <div className="h-[calc(100vh-120px)] flex flex-col gap-6">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="text-center lg:text-left">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex flex-col sm:flex-row items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200 shrink-0">
              <Brain className="w-6 h-6 text-white" />
            </div>
            Artist Coach
          </h1>
          <p className="text-slate-500 mt-1 text-sm">AI-powered mentorship trained on your career data</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-center lg:self-auto">
          <button
            onClick={() => setActiveTab('chat')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-widest flex items-center gap-2",
              activeTab === 'chat' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Coach Chat
          </button>
          <button
            onClick={() => setActiveTab('knowledge')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-widest flex items-center gap-2",
              activeTab === 'knowledge' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Database className="w-3.5 h-3.5" />
            Knowledge Base
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden">
        {/* Main Interface */}
        <div className="lg:col-span-3 flex flex-col glass-card overflow-hidden border-indigo-100 shadow-indigo-50/50">
          {activeTab === 'chat' ? (
            <>
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30"
              >
                {messages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "flex gap-3 md:gap-4 max-w-[90%] md:max-w-[85%]",
                      msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                      msg.role === 'assistant' ? "bg-indigo-600" : "bg-slate-800"
                    )}>
                      {msg.role === 'assistant' ? <Brain className="w-4 h-4 text-white" /> : <History className="w-4 h-4 text-white" />}
                    </div>
                    <div className={cn(
                      "p-3 md:p-4 rounded-2xl text-sm leading-relaxed",
                      msg.role === 'assistant' 
                        ? "bg-white border border-slate-100 text-slate-800 shadow-sm rounded-tl-none" 
                        : "bg-indigo-600 text-white shadow-md shadow-indigo-100 rounded-tr-none"
                    )}>
                      <div className="prose prose-sm max-w-none prose-slate dark:prose-invert">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-4 animate-pulse">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <Brain className="w-4 h-4 text-indigo-300" />
                    </div>
                    <div className="p-4 rounded-2xl bg-white border border-slate-100 w-32 h-12 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100">
                <div className="relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask your coach anything..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 md:py-4 px-4 md:px-6 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                  <button 
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 md:p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-100"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  Custom Knowledge Base
                </h2>
                <button 
                  onClick={() => setIsAddingResource(true)}
                  className="btn-primary py-2 px-4 text-xs"
                >
                  <Plus className="w-4 h-4" />
                  Add Resource
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {resources.map(resource => (
                  <div key={resource.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group relative">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded text-[10px] font-bold uppercase tracking-widest">
                          {resource.category}
                        </span>
                        <div className="p-1 bg-white rounded-md border border-slate-100">
                          {resource.type === 'text' && <FileText className="w-3 h-3 text-slate-400" />}
                          {resource.type === 'image' && <ImageIcon className="w-3 h-3 text-slate-400" />}
                          {resource.type === 'webpage' && <Globe className="w-3 h-3 text-slate-400" />}
                          {resource.type === 'pdf' && <FileText className="w-3 h-3 text-slate-400" />}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        {resource.url && (
                          <a 
                            href={resource.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-indigo-600"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button 
                          onClick={() => handleDeleteResource(resource.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-bold text-slate-900 mb-1">{resource.title}</h3>
                    {resource.type === 'image' && resource.url && (
                      <div className="mb-2 rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-100">
                        <img 
                          src={resource.url} 
                          alt={resource.title} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">{resource.content}</p>
                  </div>
                ))}
                {resources.length === 0 && (
                  <div className="col-span-full py-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <Database className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No resources added yet.</p>
                    <p className="text-slate-400 text-xs mt-1">Add text to train your coach on specific strategies.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar / Quick Stats */}
        <div className="space-y-6">
          <div className="glass-card p-6 border-indigo-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              Coach Memory
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-medium text-slate-600">Resources</span>
                </div>
                <span className="text-xs font-bold text-indigo-600">{resources.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-medium text-slate-600">Messages</span>
                </div>
                <span className="text-xs font-bold text-indigo-600">{messages.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-medium text-slate-600">Context Depth</span>
                </div>
                <span className="text-xs font-bold text-indigo-600">Full OS</span>
              </div>
              <button 
                onClick={clearChatHistory}
                className="w-full py-2 px-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 hover:text-red-600 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Chat History
              </button>
            </div>
          </div>

          <div className="glass-card p-6 bg-indigo-600 text-white border-none shadow-xl shadow-indigo-200">
            <h3 className="text-xs font-bold text-white/70 uppercase tracking-widest mb-3">Coach Tip</h3>
            <p className="text-sm font-medium leading-relaxed">
              "Add your marketing plans or inspiration notes to the Knowledge Base. I'll use them to give you better advice on your next release."
            </p>
          </div>
        </div>
      </div>

      {/* Add Resource Modal */}
      <AnimatePresence>
        {isAddingResource && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden"
            >
              <div className="p-6 bg-indigo-600 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Add Knowledge Resource</h3>
                <button onClick={() => setIsAddingResource(false)} className="text-white/80 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAddResource} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Title</label>
                    <input
                      required
                      type="text"
                      value={newResource.title}
                      onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                      placeholder="e.g. 2024 Marketing Strategy"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</label>
                    <select
                      value={newResource.category}
                      onChange={(e) => setNewResource({ ...newResource, category: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    >
                      <option>Strategy</option>
                      <option>Technical</option>
                      <option>Inspiration</option>
                      <option>General</option>
                      <option>Marketing</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resource Type</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'text', icon: FileText, label: 'Text' },
                      { id: 'image', icon: ImageIcon, label: 'Image' },
                      { id: 'webpage', icon: Globe, label: 'Web' },
                      { id: 'pdf', icon: FileText, label: 'PDF' }
                    ].map(type => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setNewResource({ ...newResource, type: type.id as any })}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all",
                          newResource.type === type.id 
                            ? "bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm" 
                            : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                        )}
                      >
                        <type.icon className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {newResource.type !== 'text' && newResource.type !== 'webpage' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Upload File</label>
                    <div 
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      className={cn(
                        "relative border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center gap-3",
                        dragActive ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-slate-50",
                        selectedFile ? "border-emerald-500 bg-emerald-50" : ""
                      )}
                    >
                      <input 
                        type="file" 
                        onChange={(e) => e.target.files && setSelectedFile(e.target.files[0])}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        accept={newResource.type === 'image' ? "image/*" : "application/pdf"}
                      />
                      {selectedFile ? (
                        <>
                          <div className="p-3 bg-emerald-500 rounded-xl">
                            <CheckCircle2 className="w-6 h-6 text-white" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-slate-900">{selectedFile.name}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest">File selected</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="p-3 bg-white rounded-xl shadow-sm">
                            <Upload className="w-6 h-6 text-slate-400" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-slate-900">Click or drag to upload</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                              {newResource.type === 'image' ? 'PNG, JPG, GIF' : 'PDF Document'}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {newResource.type === 'webpage' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Website URL
                    </label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        required
                        type="url"
                        value={newResource.url}
                        onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                        placeholder="https://..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {newResource.type === 'text' ? 'Content' : 'Description / Notes'}
                  </label>
                  <textarea
                    required={newResource.type === 'text'}
                    rows={4}
                    value={newResource.content}
                    onChange={(e) => setNewResource({ ...newResource, content: e.target.value })}
                    placeholder={newResource.type === 'text' ? "Paste your notes here..." : "Add some context about this resource for the coach..."}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isUploading}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading to Vault...
                    </>
                  ) : (
                    'Save to Knowledge Base'
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
