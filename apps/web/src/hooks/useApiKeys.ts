'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ApiKeyRow } from '@watchllm/types';
import { api } from '@/lib/api-client';

interface CreatedKeyPayload {
  id: string;
  full_key: string;
  key_prefix: string;
  created_at: number;
}

export function useApiKeys() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [createdKey, setCreatedKey] = useState<CreatedKeyPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const rows = await api.keys.list();
      setKeys(rows);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load API keys');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(async (name?: string) => {
    setIsCreating(true);

    try {
      const result = await api.keys.create(name && name.trim() ? name.trim() : undefined);
      setCreatedKey(result);
      await load();
    } finally {
      setIsCreating(false);
    }
  }, [load]);

  const revoke = useCallback(
    async (id: string) => {
      await api.keys.revoke(id);
      await load();
    },
    [load],
  );

  return {
    keys,
    createdKey,
    setCreatedKey,
    isLoading,
    isCreating,
    error,
    create,
    revoke,
    refresh: load,
  };
}