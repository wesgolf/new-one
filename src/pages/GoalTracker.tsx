import React, { useState } from 'react';
import GoalsTrackerComponent from '../components/GoalsTrackerComponent';
import { Toast, ToastType } from '../components/Toast';
import { AnimatePresence } from 'motion/react';

export function GoalTracker() {
  const [goalsKey, setGoalsKey] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const notify = (message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  };

  return (
    <div className="space-y-10">
      <AnimatePresence>
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </AnimatePresence>

      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="text-center sm:text-left">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary">Goal Tracker</h2>
          <p className="text-text-secondary mt-2">Define your targets and track your progress toward them.</p>
        </div>
      </header>

      <div className="max-w-full">
        <GoalsTrackerComponent 
          key={goalsKey}
          onAction={(msg) => notify(msg, 'success')} 
        />
      </div>
    </div>
  );
}
