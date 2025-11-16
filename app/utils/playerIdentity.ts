'use client';

import { getRandomStageName } from '@/lib/stageNames';

const SESSION_ID_KEY = 'lenka:sessionPlayerId';
const BASE_ID_KEY = 'lenka:basePlayerId';
let inMemoryBaseId: string | null = null;
let inMemorySessionId: string | null = null;

const generateClientId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `player-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
};

const generateSessionId = (base: string) => `${base}-${Math.random().toString(36).slice(2, 8)}`;

export function ensurePlayerClientId(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    const sessionStorage = window.sessionStorage;
    let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
    if (sessionId) {
      return sessionId;
    }

    const localStorage = window.localStorage;
    let baseId = localStorage.getItem(BASE_ID_KEY);
    if (!baseId) {
      baseId = generateClientId();
      localStorage.setItem(BASE_ID_KEY, baseId);
    }

    sessionId = generateSessionId(baseId);
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    return sessionId;
  } catch (error) {
    console.warn('Storage unavailable, falling back to in-memory client IDs', error);
    if (!inMemoryBaseId) {
      inMemoryBaseId = generateClientId();
    }
    if (!inMemorySessionId) {
      inMemorySessionId = generateSessionId(inMemoryBaseId);
    }
    return inMemorySessionId;
  }
}

export function resolvePlayerName(
  rawName: string,
  onGenerate?: (generated: string) => void
): { finalName: string; wasGenerated: boolean } {
  const trimmed = (rawName || '').trim();
  if (trimmed) {
    return { finalName: trimmed, wasGenerated: false };
  }

  const funnyName = getRandomStageName();
  if (onGenerate) {
    onGenerate(funnyName);
  }

  return { finalName: funnyName, wasGenerated: true };
}
