import React, { useState, useEffect } from 'react';
import { 
  Target, 
  TrendingUp, 
  Plus, 
  Zap,
  ArrowUpRight,
  MoreVertical,
  Sparkles,
  Loader2,
  Trash2,
  Edit2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Goal } from '../types';
import { supabase } from '../lib/supabase';
import { GoogleGenAI } from "@google/genai";
import { GoalModal } from './GoalModal';
import { calculateGoalPace } from '../engine/growth';

interface GoalsTrackerProps {
  onAction?: (msg: string) => void;
}

export default function GoalsTrackerComponent({ onAction }: GoalsTrackerProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalStatuses, setGoalStatuses] = useState<Record<string, { status: 'on-track' | 'at-risk' | 'behind', reasoning: string, current?: number }>>({});

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setGoals(data);
      }
    } catch (err) {
      console.error("Failed to fetch goals:", err);
    }
    setLoading(false);
  };

  const updateGoalProgress = async (id: string, newProgress: number) => {
    const { error } = await supabase
      .from('goals')
      .update({ current: newProgress })
      .eq('id', id);

    if (!error) {
      setGoals(goals.map(g => g.id === id ? { ...g, current: newProgress } : g));
      onAction?.("Progress updated successfully");
    }
  };

  const runAIAnalysis = async () => {
    if (goals.length === 0) return;
    setAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      
      // Fetch calendar events (shows) for context
      const { data: shows } = await supabase.from('shows').select('*');
      const currentDate = new Date().toISOString().split('T')[0];

      // Bulk analysis for individual goal statuses
      const statusResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        config: { responseMimeType: "application/json" },
        contents: `Today's date is ${currentDate}. 
        Analyze these artist goals and for each one, determine if they are 'on-track', 'at-risk', or 'behind' based on progress, typical artist growth patterns, and the provided calendar events. 
        
        Calendar Events (Shows): ${JSON.stringify(shows)}
        
        For goals with manual_progress=false, you should also estimate the 'current' value if it can be derived from the calendar (e.g., counting 'completed' shows for a 'yearly sets' goal). 
        
        Return a JSON object where keys are goal IDs and values are { status, reasoning (max 10 words), current (optional, estimated progress) }. 
        
        Goals: ${JSON.stringify(goals.map(g => ({ 
          id: g.id, 
          title: g.title, 
          target: g.target,
          current: g.current,
          unit: g.unit,
          start_date: g.start_date,
          deadline: g.deadline,
          manual_progress: g.manual_progress
        })))}`,
      });
      
      try {
        const statuses = JSON.parse(statusResponse.text);
        setGoalStatuses(statuses);

        // Update database for auto-tracked goals if AI found a new 'current' value
        for (const goalId in statuses) {
          const goal = goals.find(g => g.id === goalId);
          if (goal && !goal.manual_progress && statuses[goalId].current !== undefined) {
            await updateGoalProgress(goalId, statuses[goalId].current);
          }
        }
      } catch (e) {
        console.error("Failed to parse AI status response", e);
      }

      // Overall strategic analysis
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Today's date is ${currentDate}. Analyze these artist goals and provide a short, actionable strategic insight (max 2 sentences): ${JSON.stringify(goals.map(g => ({ title: g.title, progress: (g.current/g.target)*100 + '%' })))}`,
      });
      setAnalysis(response.text || "Keep pushing towards your targets!");
    } catch (err) {
      console.error("AI Analysis failed:", err);
      setAnalysis("Focus on your short-term social goals to build momentum for your streaming targets.");
    }
    setAnalyzing(false);
  };

  const deleteGoal = async (id: string) => {
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (!error) {
      setGoals(goals.filter(g => g.id !== id));
      onAction?.("Goal deleted successfully");
    }
    setShowMenu(null);
  };

  const groupedGoals = {
    short: goals.filter(g => g.term === 'short'),
    medium: goals.filter(g => g.term === 'medium'),
    long: goals.filter(g => g.term === 'long'),
  };

  const renderGoalList = (termGoals: Goal[]) => (
    <div className="space-y-4">
      {termGoals.map((goal) => {
          const progress = (goal.current / goal.target) * 100;
          const aiStatus = goalStatuses[goal.id];
          const pace = calculateGoalPace(goal);

          return (
            <div key={goal.id} className="space-y-3 relative group/item p-4 bg-slate-50/30 rounded-2xl border border-transparent hover:border-slate-100 transition-all">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-slate-900">{goal.title}</span>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter",
                      pace.status === 'ahead' && "bg-emerald-100 text-emerald-700",
                      pace.status === 'on-track' && "bg-blue-100 text-blue-700",
                      pace.status === 'behind' && "bg-rose-100 text-rose-700"
                    )}>
                      {pace.status}
                    </span>
                  </div>
                  <span className="text-slate-400 font-medium text-xs">/ {goal.target.toLocaleString()} {goal.unit}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-xs font-bold",
                    progress >= 75 ? "text-emerald-600" : "text-blue-600"
                  )}>
                    {progress.toFixed(0)}%
                  </span>
                  <div className="relative">
                    <button 
                      onClick={() => setShowMenu(showMenu === goal.id ? null : goal.id)}
                      className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-slate-400" />
                    </button>
                    {showMenu === goal.id && (
                      <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-100 rounded-xl shadow-xl z-50 py-1">
                        {goal.manual_progress && (
                          <button 
                            onClick={() => {
                              const newVal = prompt(`Update current value for ${goal.title}:`, goal.current.toString());
                              if (newVal !== null) {
                                updateGoalProgress(goal.id, parseFloat(newVal));
                              }
                              setShowMenu(null);
                            }}
                            className="w-full px-4 py-2 text-left text-xs font-bold text-blue-600 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <TrendingUp className="w-3 h-3" /> Update Progress
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            setEditingGoal(goal);
                            setShowGoalModal(true);
                            setShowMenu(null);
                          }}
                          className="w-full px-4 py-2 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                        <button 
                          onClick={() => deleteGoal(goal.id)}
                          className="w-full px-4 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-1000",
                    progress >= 75 ? "bg-emerald-500" : "bg-blue-500"
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <p className="text-[10px] text-slate-500 font-medium">Est. Completion: <span className="text-slate-900 font-bold">{pace.predictedCompletion}</span></p>
                </div>
                {pace.status === 'behind' && (
                  <div className="flex items-center gap-1 text-rose-600">
                    <AlertCircle className="w-3 h-3" />
                    <p className="text-[10px] font-bold uppercase tracking-tighter">Action Required</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );

  return (
    <section className="glass-card p-8 group hover:border-blue-200 transition-all">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Target className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Goals Tracker</h3>
        </div>
        <button 
          onClick={() => {
            setEditingGoal(null);
            setShowGoalModal(true);
          }}
          className="btn-secondary text-xs py-2 px-3"
        >
          <Plus className="w-4 h-4" />
          Add Goal
        </button>
      </div>

      <div className="space-y-12">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : goals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Zap className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-bold text-slate-900">Short Term</h4>
              </div>
              {groupedGoals.short.length > 0 ? renderGoalList(groupedGoals.short) : <p className="text-xs text-slate-400 italic">No short-term goals</p>}
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Target className="w-4 h-4 text-blue-500" />
                <h4 className="text-sm font-bold text-slate-900">Medium Term</h4>
              </div>
              {groupedGoals.medium.length > 0 ? renderGoalList(groupedGoals.medium) : <p className="text-xs text-slate-400 italic">No medium-term goals</p>}
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <ArrowUpRight className="w-4 h-4 text-purple-500" />
                <h4 className="text-sm font-bold text-slate-900">Long Term</h4>
              </div>
              {groupedGoals.long.length > 0 ? renderGoalList(groupedGoals.long) : <p className="text-xs text-slate-400 italic">No long-term goals</p>}
            </div>
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
              <Target className="w-8 h-8 text-slate-300" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">No Active Goals</h4>
            <p className="text-sm text-slate-500 max-w-[280px] mt-2 mb-6">
              Set your first target to start tracking your growth and momentum.
            </p>
            <button 
              onClick={() => {
                setEditingGoal(null);
                setShowGoalModal(true);
              }}
              className="btn-primary"
            >
              Set First Goal
            </button>
          </div>
        )}
      </div>

      {goals.length > 0 && (
        <div className="mt-8 p-4 bg-purple-50 border border-purple-100 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">AI Analysis</p>
            </div>
            {!analysis && !analyzing && (
              <button 
                onClick={runAIAnalysis}
                className="text-[10px] font-bold text-purple-600 hover:underline"
              >
                Analyze Progress
              </button>
            )}
          </div>
          {analyzing ? (
            <div className="flex items-center gap-2 text-purple-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              <p className="text-xs font-medium italic">Generating insights...</p>
            </div>
          ) : analysis ? (
            <p className="text-xs font-medium text-purple-900 leading-relaxed">
              {analysis}
            </p>
          ) : (
            <p className="text-xs text-purple-400 italic">
              Click analyze to get strategic insights on your goals.
            </p>
          )}
        </div>
      )}

      <GoalModal 
        isOpen={showGoalModal} 
        onClose={() => {
          setShowGoalModal(false);
          setEditingGoal(null);
        }} 
        onSuccess={() => {
          fetchGoals();
          onAction?.(editingGoal ? "Goal updated successfully" : "Goal added successfully");
        }} 
        goal={editingGoal}
      />
    </section>
  );
}
