import { supabase } from './supabaseClient';

// Typen (ggf. anpassen)
export interface PdfChatEntry {
  id: number; // falls du uuid hast: string
  created_at: string;
  filename: string;
  pages_text: string[]; // Text je Seite
  chat_history: ChatQA[];
  user_id?: string;
}

export interface ChatQA {
  role: 'user' | 'assistant';
  content: string;
  page?: number; // Auf welcher Seite bezog sich die Frage?
}

// Neues PDF speichern
export async function savePdfChat(filename: string, pagesText: string[], userId?: string): Promise<PdfChatEntry | null> {
  const { data, error } = await supabase
    .from('pdf_chats')
    .insert([{
      filename,
      pages_text: pagesText,
      chat_history: [],
      user_id: userId ?? null
    }])
    .select()
    .single();
  if (error) throw error;
  return data as PdfChatEntry;
}

// Bestehenden Chat abrufen
export async function getPdfChatById(id: number): Promise<PdfChatEntry | null> {
  const { data, error } = await supabase
    .from('pdf_chats')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as PdfChatEntry;
}

// Chatverlauf updaten
export async function updatePdfChatHistory(id: number, newHistory: ChatQA[]): Promise<void> {
  const { error } = await supabase
    .from('pdf_chats')
    .update({ chat_history: newHistory })
    .eq('id', id);
  if (error) throw error;
}
