'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useApiKeys } from '@/hooks/useApiKeys';

function formatTimestamp(unix: number | null) {
  if (unix === null) return 'Never';
  return new Date(unix * 1000).toLocaleString();
}

export function SettingsClient() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [copied, setCopied] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const apiKeys = useApiKeys();

  const onCreateKey = async () => {
    try {
      setMutationError(null);
      await apiKeys.create(keyName || undefined);
      setKeyName('');
    } catch (createError) {
      setMutationError(createError instanceof Error ? createError.message : 'Failed to create key');
    }
  };

  const onRevokeKey = async (keyId: string) => {
    const confirmed = window.confirm('Revoke this API key? This action cannot be undone.');
    if (!confirmed) return;

    try {
      setMutationError(null);
      await apiKeys.revoke(keyId);
    } catch (revokeError) {
      setMutationError(revokeError instanceof Error ? revokeError.message : 'Failed to revoke key');
    }
  };

  const copyFullKey = async () => {
    if (!apiKeys.createdKey) return;

    await navigator.clipboard.writeText(apiKeys.createdKey.full_key);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  if (apiKeys.isLoading) {
    return <div className="rounded-lg border border-border bg-surface p-6 text-text-secondary">Loading API keys...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-border bg-surface p-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">API keys</h1>
          <p className="mt-1 text-sm text-text-secondary">Create and revoke keys for SDK and CI access.</p>
        </div>
        <Button
          variant="accent"
          onClick={() => {
            setCreateModalOpen(true);
            apiKeys.setCreatedKey(null);
          }}
        >
          Create new key
        </Button>
      </div>

      {apiKeys.error || mutationError ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {apiKeys.error ?? mutationError}
        </div>
      ) : null}

      {apiKeys.keys.length === 0 ? (
        <EmptyState
          icon={
            <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M7 14a5 5 0 1 1 2.9 4.5L8 20l-2-2 2-2-2-2 2-2 2 2h1" />
            </svg>
          }
          title="No API keys yet"
          description="Create a key to run simulations from your app or CI pipeline."
          ctaLabel="Create first key"
          onCtaClick={() => {
            setCreateModalOpen(true);
            apiKeys.setCreatedKey(null);
          }}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="min-w-full border-collapse bg-surface text-sm">
            <thead className="bg-surface-raised text-left text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-medium">Prefix</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Last used</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.keys.map((key) => (
                <tr key={key.id} className="border-t border-border text-text-primary">
                  <td className="px-4 py-3 font-mono">{key.key_prefix}...</td>
                  <td className="px-4 py-3">{key.name ?? 'Unnamed key'}</td>
                  <td className="px-4 py-3 text-text-secondary">{formatTimestamp(key.created_at)}</td>
                  <td className="px-4 py-3 text-text-secondary">{formatTimestamp(key.last_used_at)}</td>
                  <td className="px-4 py-3">
                    <Button variant="danger" onClick={() => onRevokeKey(key.id)}>
                      Revoke
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {createModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-5">
            <h2 className="text-lg font-semibold text-text-primary">Create API key</h2>

            {!apiKeys.createdKey ? (
              <>
                <label htmlFor="api-key-name" className="mt-4 block text-sm text-text-secondary">
                  Key name (optional)
                </label>
                <input
                  id="api-key-name"
                  value={keyName}
                  onChange={(event) => setKeyName(event.target.value)}
                  placeholder="Production worker"
                  className="mt-2 h-10 w-full rounded-[7px] border border-border bg-surface-raised px-3 text-text-primary outline-none transition-all duration-150 ease-in-out focus:border-border-hover"
                />

                <div className="mt-5 flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setCreateModalOpen(false);
                      setKeyName('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button variant="accent" onClick={onCreateKey} disabled={apiKeys.isCreating}>
                    {apiKeys.isCreating ? 'Creating...' : 'Create key'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm text-warning">
                  This is the only time the full key will be shown. Copy and store it securely.
                </p>
                <pre className="mt-3 overflow-auto rounded-md border border-border bg-surface-raised p-3 font-mono text-xs text-text-primary">
                  {apiKeys.createdKey.full_key}
                </pre>

                <div className="mt-5 flex items-center justify-end gap-2">
                  <Button variant="ghost" onClick={copyFullKey}>
                    {copied ? 'Copied' : 'Copy key'}
                  </Button>
                  <Button
                    variant="accent"
                    onClick={() => {
                      setCreateModalOpen(false);
                      apiKeys.setCreatedKey(null);
                    }}
                  >
                    Done
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}