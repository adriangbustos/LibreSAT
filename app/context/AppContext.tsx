'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import type { Question, QuestionDexState, TestSession } from '@/app/types';
import { loadQuestions, loadQuestionsMap } from '@/app/lib/db';
import { getQuestionDex, getTestSessions, saveTestSession as storageSaveSession } from '@/app/lib/storage';

interface AppContextValue {
  // Data
  questions: Question[];
  questionsMap: Map<string, Question>;
  isLoading: boolean;
  error: string | null;
  // QuestionDex
  questionDex: QuestionDexState;
  refreshQuestionDex: () => void;
  // Sessions
  sessions: TestSession[];
  refreshSessions: () => void;
  saveSession: (s: TestSession) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsMap, setQuestionsMap] = useState<Map<string, Question>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questionDex, setQuestionDex] = useState<QuestionDexState>({ entries: {}, last_updated: '' });
  const [sessions, setSessions] = useState<TestSession[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [qs, map] = await Promise.all([loadQuestions(), loadQuestionsMap()]);
        if (!mounted) return;
        setQuestions(qs);
        setQuestionsMap(map);
        setQuestionDex(getQuestionDex());
        setSessions(getTestSessions());
      } catch (e: unknown) {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to load data');
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const refreshQuestionDex = useCallback(() => {
    setQuestionDex(getQuestionDex());
  }, []);

  const refreshSessions = useCallback(() => {
    setSessions(getTestSessions());
  }, []);

  const saveSession = useCallback((session: TestSession) => {
    storageSaveSession(session);
    setSessions(getTestSessions());
  }, []);

  return (
    <AppContext.Provider value={{
      questions,
      questionsMap,
      isLoading,
      error,
      questionDex,
      refreshQuestionDex,
      sessions,
      refreshSessions,
      saveSession,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
