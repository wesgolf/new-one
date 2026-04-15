import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentAuthUser } from '../lib/auth';

export function useArtistData<T>(table: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (import.meta.env.VITE_SUPABASE_URL === undefined || import.meta.env.VITE_SUPABASE_PK === undefined) {
      setError('Supabase configuration is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_PK in the AI Studio Secrets panel.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data: result, error: fetchError } = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // This code often means the table doesn't exist or is empty in some contexts, 
          // but for select('*') it usually means something else.
          // Actually, '42P01' is the code for "relation does not exist".
        }
        throw fetchError;
      }
      setData(result || []);
    } catch (err: any) {
      let message = err.message;
      const isSchemaError = err.code === '42P01' || 
                            (err.message && err.message.includes('Could not find the table')) ||
                            (err.message && err.message.includes('Could not find the')) ||
                            (err.details && err.details.includes('results in 0 columns'));
      
      if (isSchemaError) {
        message = `Database schema mismatch. Please copy the code from "supabase-schema.sql" and run it in your Supabase SQL Editor to update your tables.`;
      } else if (err.message === 'Failed to fetch') {
        message = 'Connection to Supabase failed. Please check your internet connection and Supabase URL.';
      } else if (err.code === 'PGRST301') {
        message = 'Supabase API Key is invalid or expired.';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [table]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addItem = async (item: Partial<T>) => {
    try {
      const user = await getCurrentAuthUser();
      const insertData = user ? { ...item, user_id: user.id } : item;

      const { data: result, error: addError } = await supabase
        .from(table)
        .insert([insertData])
        .select();

      if (addError) throw addError;
      setData(prev => [result[0], ...prev]);
      return result[0];
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateItem = async (id: string, updates: Partial<T>) => {
    try {
      const user = await getCurrentAuthUser();

      let query = supabase.from(table).update(updates).eq('id', id);
      
      // If user is logged in, we try to match user_id, but we also allow matching if user_id is null
      // Actually, for simplicity in this prototype, we'll just match by ID if RLS is not enabled
      // or we can use an OR filter if supported, but eq().eq() is an AND.
      // Let's stick to ID for now to ensure functionality.
      
      const { data: result, error: updateError } = await query.select();

      if (updateError) throw updateError;
      if (!result || result.length === 0) {
        console.warn('No record found to update for ID:', id);
        throw new Error('No record found to update.');
      }
      
      const updatedItem = result[0];
      setData(prev => prev.map(item => (item as any).id === id ? updatedItem : item));
      return updatedItem;
    } catch (err: any) {
      console.error('Update error:', err);
      setError(err.message);
      throw err;
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const user = await getCurrentAuthUser();

      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      
      setData(prev => prev.filter(item => (item as any).id !== id));
    } catch (err: any) {
      console.error('Delete error:', err);
      setError(err.message);
      throw err;
    }
  };

  return { data, loading, error, fetchData, addItem, updateItem, deleteItem };
}
