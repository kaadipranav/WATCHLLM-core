'use client';

import { useEffect, useState } from 'react';
import { apiKeys, type ApiKeyListItem, type CreateKeyResponse } from '../../../lib/api';

function timeAgo(ts: number): string {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts * 1000).toLocaleDateString();
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn btn-ghost btn-sm"
      style={{ padding: '0 8px' }}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

export default function ApiKeysPage(): JSX.Element {
  const [keyList, setKeyList] = useState<ApiKeyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdKey, setCreatedKey] = useState<CreateKeyResponse | null>(null);
  const [revokeConfirm, setRevokeConfirm] = useState<ApiKeyListItem | null>(null);

  const load = async () => {
    const res = await apiKeys.list();
    setKeyList(res.data ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const handleCreate = async () => {
    setSubmitting(true);
    const res = await apiKeys.create(newKeyName.trim() || undefined);
    setSubmitting(false);
    if (res.error) return;
    setCreatedKey(res.data!);
    setNewKeyName('');
    setCreateOpen(false);
    await load();
  };

  const handleRevoke = async (key: ApiKeyListItem) => {
    await apiKeys.revoke(key.id);
    setRevokeConfirm(null);
    await load();
  };

  return (
    <div className="fade-in-up">
      {/* Create Modal */}
      {createOpen && (
        <div className="modal-overlay" onClick={() => setCreateOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h3>Create API Key</h3>
              <button onClick={() => setCreateOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="field" style={{ marginBottom: 24 }}>
              <label className="label">Key name (optional)</label>
              <input
                className="input"
                placeholder="e.g. CI/CD Pipeline"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleCreate()}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setCreateOpen(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={submitting} onClick={() => void handleCreate()}>
                {submitting ? 'Creating…' : 'Create Key'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Created key reveal */}
      {createdKey && (
        <div className="modal-overlay" onClick={() => setCreatedKey(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 'var(--r-lg)',
                background: 'var(--accent-dim)', border: '1px solid rgba(0,229,160,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', fontSize: '1.5rem',
              }}>🔑</div>
              <h3 style={{ marginBottom: 8 }}>API Key Created</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Copy this key now. You will <strong style={{ color: 'var(--danger)' }}>never see it again.</strong>
              </p>
            </div>
            <div style={{
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)', padding: '12px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 24, gap: 12,
            }}>
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--accent)', wordBreak: 'break-all' }}>
                {createdKey.full_key}
              </code>
              <CopyButton text={createdKey.full_key} />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: 20 }}>
              Use this key in the <code style={{ fontFamily: 'var(--font-mono)' }}>X-WatchLLM-Api-Key</code> header or as the SDK token.
            </p>
            <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={() => setCreatedKey(null)}>
              I've saved my key
            </button>
          </div>
        </div>
      )}

      {/* Revoke confirm */}
      {revokeConfirm && (
        <div className="modal-overlay" onClick={() => setRevokeConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>Revoke API Key</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
              Revoking <strong>{revokeConfirm.name ?? `wllm_${revokeConfirm.key_prefix}_…`}</strong> will immediately break any integrations using it.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setRevokeConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => void handleRevoke(revokeConfirm)}>Revoke Key</button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1>API Keys</h1>
          <p>Use API keys to authenticate the Python SDK and CLI.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Key
        </button>
      </div>

      {/* SDK snippet */}
      <div className="card" style={{ marginBottom: 28, padding: '18px 24px' }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 12 }}>Quick setup</p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 6 }}>SDK / Python</p>
            <pre className="code-block" style={{ fontSize: '0.78rem' }}>
{`import watchllm
watchllm.configure(api_key="wllm_...")`}
            </pre>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 6 }}>CLI</p>
            <pre className="code-block" style={{ fontSize: '0.78rem' }}>
{`watchllm auth login --api-key wllm_...`}
            </pre>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 6 }}>HTTP Header</p>
            <pre className="code-block" style={{ fontSize: '0.78rem' }}>
{`X-WatchLLM-Api-Key: wllm_...`}
            </pre>
          </div>
        </div>
      </div>

      {/* Key table */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 'var(--r-md)' }} />)}
        </div>
      ) : keyList.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
          </div>
          <h3>No API keys</h3>
          <p>Create an API key to use WatchLLM from the Python SDK or CLI.</p>
          <button className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}>Create API Key</button>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Key prefix</th>
                <th>Last used</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {keyList.map((key) => (
                <tr key={key.id}>
                  <td style={{ fontWeight: 500 }}>{key.name ?? <span style={{ color: 'var(--text-tertiary)' }}>Unnamed</span>}</td>
                  <td>
                    <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--accent)' }}>
                      wllm_{key.key_prefix}_••••••••
                    </code>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                    {key.last_used_at ? timeAgo(key.last_used_at) : <span style={{ color: 'var(--text-tertiary)' }}>Never</span>}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{timeAgo(key.created_at)}</td>
                  <td>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setRevokeConfirm(key)}
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
