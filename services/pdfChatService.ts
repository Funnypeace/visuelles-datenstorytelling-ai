// services/pdfChatService.ts

import { supabase } from './supabaseClient';

export interface PdfChatEntry {
  id: string;
  created_at: string;
  filename: string;
  pages_text: { [page: string]: string };
  chat_history: { role: 'user' | 'assistant', content: string }[];
  user_id?: string;
}

// Ein Chat-Dokument auslesen (per ID)
export async function getPdfChatById(id: string): Promise<PdfChatEntry | null> {
  const { data, error } = await supabase
    .from('pdf_chats')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[Supabase] Fehler beim Laden pdf_chats:', error);
    return null;
  }
  return data as PdfChatEntry;
}

// Chatverlauf aktualisieren (anhängen)
export async function updatePdfChatHistory(id: string, chat_history: PdfChatEntry['chat_history']) {
  const { data, error } = await supabase
    .from('pdf_chats')
    .update({ chat_history })
    .eq('id', id)
    .select();

  if (error) {
    console.error('[Supabase] Fehler beim Aktualisieren pdf_chats:', error);
    throw error;
  }
  return data;
}

// Hilfs-Typ für Chat-Einträge
export type ChatQA = {
  role: 'user' | 'assistant';
  content: string;
};

// Dummy-Implementierung: PDF-Chat speichern (für Build/Tests)
export async function savePdfChat(filename: string, pages: string[]): Promise<{id: string}> {
  // Hier kommt später echte Supabase-Logik rein. Aktuell nur Demo!
  return { id: "DEMO_CHAT_ID" };
}
