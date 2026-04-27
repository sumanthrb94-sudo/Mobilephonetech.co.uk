import { useCallback, useEffect, useState } from 'react';

const KEY = 'mobilephonemarket:recently-viewed';
const MAX = 12;

export function useRecentlyViewed() {
  const [ids, setIds] = useState<string[]>(() => load());

  useEffect(() => {
    const handler = () => setIds(load());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const track = useCallback((id: string) => {
    setIds((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, MAX);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setIds([]);
    try { localStorage.removeItem(KEY); } catch {}
  }, []);

  return { ids, track, clear };
}

function load(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
