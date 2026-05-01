import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useReminders() {
  useEffect(() => {
    const checkReminders = async () => {
      try {
        if (!('Notification' in window) || Notification.permission === 'denied') {
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (!userId) return;

        const now = new Date();
        const tomorrowStart = new Date(now);
        tomorrowStart.setDate(now.getDate() + 1);
        tomorrowStart.setHours(0, 0, 0, 0);
        const tomorrowEnd = new Date(tomorrowStart);
        tomorrowEnd.setHours(23, 59, 59, 999);

        const [eventsRes, goalsRes, tasksRes] = await Promise.all([
          supabase
            .from('calendar_events')
            .select('title,starts_at,event_type')
            .eq('user_id', userId)
            .gte('starts_at', tomorrowStart.toISOString())
            .lt('starts_at', tomorrowEnd.toISOString()),
          supabase
            .from('goals')
            .select('title,due_by')
            .eq('user_id', userId)
            .gte('due_by', tomorrowStart.toISOString())
            .lt('due_by', tomorrowEnd.toISOString()),
          supabase
            .from('tasks')
            .select('title,due_date,completed')
            .or(`user_id_assigned_by.eq.${userId},user_id_assigned_to.eq.${userId}`)
            .eq('completed', 'pending')
            .eq('due_date', tomorrowStart.toISOString().slice(0, 10)),
        ]);

        (eventsRes.data ?? []).forEach((event) => {
          showNotification(`Upcoming ${event.event_type}: ${event.title}`, 'You have a calendar event scheduled for tomorrow.');
        });

        (goalsRes.data ?? []).forEach((goal) => {
          showNotification(`Goal due tomorrow: ${goal.title}`, 'One of your goals reaches its due date tomorrow.');
        });

        (tasksRes.data ?? []).forEach((task) => {
          showNotification(`Task due tomorrow: ${task.title}`, 'You have an open task due tomorrow.');
        });
      } catch (err) {
        console.error('Reminder check failed:', err);
      }
    };

    const showNotification = (title: string, body: string) => {
      if (!("Notification" in window)) return;
      
      if (Notification.permission === "granted") {
        new Notification(title, { body });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
            new Notification(title, { body });
          }
        });
      } else {
        // Fallback if notifications are denied
      }
    };

    // Check on mount
    checkReminders();
    
    // Check every hour
    const interval = setInterval(checkReminders, 3600000);
    return () => clearInterval(interval);
  }, []);
}
