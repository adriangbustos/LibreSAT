import type { VocabWord } from '@/app/types';

let cachedVocab: VocabWord[] | null = null;

export async function loadVocabulary(): Promise<VocabWord[]> {
  if (cachedVocab) return cachedVocab;
  try {
    const res = await fetch('/vocabulary_database.json');
    if (!res.ok) throw new Error('Failed to fetch vocabulary database');
    const data = await res.json();
    cachedVocab = data;
    return data;
  } catch (err) {
    console.error('Error loading vocabulary:', err);
    throw err;
  }
}

export async function getVocabChunk(setId: string): Promise<VocabWord[]> {
  const allVocab = await loadVocabulary();
  const chunkIndex = parseInt(setId, 10) - 1;
  const chunkSize = 50;
  
  if (isNaN(chunkIndex) || chunkIndex < 0) {
    return [];
  }
  
  const startIndex = chunkIndex * chunkSize;
  return allVocab.slice(startIndex, startIndex + chunkSize);
}
