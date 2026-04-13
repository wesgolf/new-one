import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useReminders() {
  useEffect(() => {
    const checkReminders = async () => {
      try {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        // Check releases
        const { data: releases } = await supabase
          .from('releases')
          .select('title, release_date')
          .eq('release_date', tomorrowStr);

        if (releases && releases.length > 0) {
          releases.forEach(r => {
            showNotification(`Upcoming Release: ${r.title}`, `Your release is scheduled for tomorrow!`);
          });
        }

        // Check content items
        const { data: content } = await supabase
          .from('content_items')
          .select('title, scheduled_date')
          .filter('scheduled_date', 'gte', tomorrowStr + 'T00:00:00Z')
          .filter('scheduled_date', 'lt', tomorrowStr + 'T23:59:59Z');

        if (content && content.length > 0) {
          content.forEach(c => {
            showNotification(`Upcoming Post: ${c.title}`, `You have a post scheduled for tomorrow!`);
          });
        }
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
