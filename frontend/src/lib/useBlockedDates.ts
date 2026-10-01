import { useCallback, useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPost } from '../api/client';
import type { BlockedDate } from '../types/blockedDate';

export function useBlockedDates(onError: (message: string) => void) {
  const [blockedDates, setBlockedDates] = useState<BlockedDate[] | null>(null);

  const load = useCallback(() => {
    apiGet<BlockedDate[]>('/api/blocked-dates').then(setBlockedDates).catch(() => setBlockedDates([]));
  }, []);

  useEffect(load, [load]);

  async function add(date: string, reason: string): Promise<boolean> {
    onError('');
    try {
      await apiPost('/api/blocked-dates', { date, reason: reason || undefined });
      load();
      return true;
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to block date');
      return false;
    }
  }

  async function remove(id: string) {
    try {
      await apiDelete(`/api/blocked-dates/${id}`);
      load();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to remove blocked date');
    }
  }

  return { blockedDates, add, remove };
}
