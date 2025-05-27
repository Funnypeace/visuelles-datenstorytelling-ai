import { supabase } from './supabaseClient';

// Neue Analyse einfügen
export async function insertAnalysis(filename: string, data: any, insights: string) {
  const { data: insertData, error } = await supabase
    .from('analyses')
    .insert([{ filename, data, insights }]);
  if (error) throw error;
  return insertData;
}

// Alle Analysen abrufen
export async function getAllAnalyses() {
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
