'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '../lib/auth-context';

type DashboardCtaProps = {
  className: string;
  signedOutLabel?: string;
  signedInLabel?: string;
  dashboardHref?: string;
};

export function DashboardCta({
  className,
  signedOutLabel = 'Sign in',
  signedInLabel = 'Open dashboard',
  dashboardHref = '/dashboard',
}: DashboardCtaProps): JSX.Element {
  const { user, loginWithGitHub, loginWithGoogle, signInWithEmail, signUpWithEmail, refetch } = useAuth();
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true';
  const [authOpen, setAuthOpen] = useState(false);
  const [mode, setMode] = useState<'options' | 'sign-in' | 'sign-up'>('options');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const closeAuthModal = () => {
    setAuthOpen(false);
    setMode('options');
    setError('');
    setSubmitting(false);
  };

  const clearCredentials = () => {
    setName('');
    setEmail('');
    setPassword('');
    setError('');
  };

  const handleSocialLogin = (provider: 'github' | 'google') => {
    closeAuthModal();
    if (provider === 'github') {
      loginWithGitHub();
      return;
    }
    loginWithGoogle();
  };

  const completeEmailAuth = async (result: { ok: true } | { ok: false; error: string }) => {
    if (!result.ok) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    await refetch();
    closeAuthModal();

    if (typeof window !== 'undefined' && window.location.pathname === '/') {
      window.location.href = dashboardHref;
    }
  };

  const handleEmailSignIn = async () => {
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }

    setSubmitting(true);
    setError('');
    const result = await signInWithEmail(email.trim(), password);
    await completeEmailAuth(result);
  };

  const handleEmailSignUp = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError('Name, email, and password are required.');
      return;
    }

    setSubmitting(true);
    setError('');
    const result = await signUpWithEmail(name.trim(), email.trim(), password);
    await completeEmailAuth(result);
  };

  if (user) {
    return (
      <Link className={className} href={dashboardHref}>
        {signedInLabel}
      </Link>
    );
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setAuthOpen(true)}>
        {signedOutLabel}
      </button>

      {authOpen && (
        <div className="modal-overlay" onClick={closeAuthModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.05rem' }}>
                {mode === 'options' ? 'Sign in to WatchLLM' : mode === 'sign-in' ? 'Sign in with email' : 'Create account'}
              </h3>
              <button
                type="button"
                onClick={closeAuthModal}
                className="btn btn-ghost btn-sm"
                style={{ padding: '0 8px' }}
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {mode === 'options' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => handleSocialLogin('github')}>
                  Continue with GitHub
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    if (googleEnabled) {
                      handleSocialLogin('google');
                    }
                  }}
                  disabled={!googleEnabled}
                  title={googleEnabled ? undefined : 'Enable NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true after setting Google OAuth secrets on the API worker.'}
                >
                  {googleEnabled ? 'Continue with Google' : 'Continue with Google (Enable after config)'}
                </button>
                <button type="button" className="btn btn-primary" onClick={() => { clearCredentials(); setMode('sign-in'); }}>
                  Continue with Email
                </button>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', marginTop: 4 }}>
                  Google sign-in can be enabled by setting GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET on the API worker and NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true on the web app.
                </p>
              </div>
            )}

            {mode !== 'options' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {mode === 'sign-up' && (
                  <div className="field">
                    <label className="label">Full name</label>
                    <input
                      className="input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ada Lovelace"
                      autoComplete="name"
                    />
                  </div>
                )}

                <div className="field">
                  <label className="label">Email</label>
                  <input
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                  />
                </div>

                <div className="field">
                  <label className="label">Password</label>
                  <input
                    className="input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                  />
                </div>

                {error && (
                  <div style={{ background: 'var(--danger-dim)', border: '1px solid rgba(255, 109, 69, 0.3)', borderRadius: 'var(--r-md)', padding: '8px 10px' }}>
                    <p style={{ color: 'var(--danger)', fontSize: '0.82rem' }}>{error}</p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => { setMode('options'); setError(''); setSubmitting(false); }}>
                    Back
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void (mode === 'sign-in' ? handleEmailSignIn() : handleEmailSignUp())}
                    disabled={submitting}
                  >
                    {submitting
                      ? (mode === 'sign-in' ? 'Signing in…' : 'Creating…')
                      : (mode === 'sign-in' ? 'Sign In' : 'Create Account')}
                  </button>
                </div>

                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ alignSelf: 'center', marginTop: 2 }}
                  onClick={() => {
                    setError('');
                    setSubmitting(false);
                    setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
                  }}
                >
                  {mode === 'sign-in' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}