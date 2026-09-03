import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiPost } from '../api/client';
import { startGoogleOAuth } from '../auth/supabase';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09A6.97 6.97 0 0 1 5.48 12c0-.72.13-1.43.36-2.09V7.07H2.18A11.96 11.96 0 0 0 1 12c0 1.93.46 3.75 1.18 4.93l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 3l18 18M9.9 9.9a3 3 0 0 0 4.2 4.2M6.2 6.6C4 8.1 2.5 12 2.5 12S6 18.5 12 18.5c1.8 0 3.3-.4 4.6-1.1M17.9 15.2c1.9-1.5 3.1-3.2 3.6-3.2 0 0-1.2-2.4-3.4-4.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Signup() {
  const [businessName, setBusinessName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await apiPost('/api/auth/signup', {
        businessName,
        firstName,
        lastName,
        email,
        password,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    setResendMessage(null);
    setIsResending(true);
    try {
      const { message } = await apiPost<{ message: string }>('/api/auth/resend', { email });
      setResendMessage({ type: 'success', text: message });
    } catch (err) {
      setResendMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not resend the email',
      });
    } finally {
      setIsResending(false);
    }
  }

  async function handleGoogle() {
    setError('');
    setIsGoogleLoading(true);
    try {
      await startGoogleOAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
      setIsGoogleLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <section className="login-visual" aria-hidden="true">
        <div className="visual-grain" />
        <div className="login-visual-content">
          <span className="login-eyebrow">Wedding Tapes Studio</span>
          <h1 className="login-visual-title">
            Every proposal,
            <br />
            ready before the coffee&rsquo;s cold.
          </h1>
          <p className="login-visual-copy">
            Build packages, price them instantly, and send a polished quote —
            all from one desk.
          </p>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-card">
          {submitted ? (
            <>
              <div className="login-card-header">
                <span className="login-mark">WT</span>
                <h2>Check your email</h2>
                <p>We sent a confirmation link to {email}. Verify it, then log in.</p>
              </div>

              {resendMessage && (
                <p
                  className={resendMessage.type === 'success' ? 'form-success' : 'form-error'}
                  role={resendMessage.type === 'success' ? 'status' : 'alert'}
                >
                  {resendMessage.text}
                </p>
              )}

              <button
                type="button"
                className="submit-btn"
                onClick={handleResend}
                disabled={isResending}
              >
                {isResending && <Spinner />}
                {isResending ? 'Resending…' : 'Resend email'}
              </button>

              <p>
                Already have an account? <Link to="/">Log in</Link>
              </p>
            </>
          ) : (
            <>
              <div className="login-card-header">
                <span className="login-mark">WT</span>
                <h2>Create your workspace</h2>
                <p>Set up your studio in a minute</p>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                <div className="field">
                  <label htmlFor="signup-business-name">Business name</label>
                  <div className="input-shell">
                    <input
                      id="signup-business-name"
                      type="text"
                      autoComplete="organization"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="signup-first-name">First name</label>
                  <div className="input-shell">
                    <input
                      id="signup-first-name"
                      type="text"
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="signup-last-name">Last name</label>
                  <div className="input-shell">
                    <input
                      id="signup-last-name"
                      type="text"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="signup-email">Email</label>
                  <div className="input-shell">
                    <MailIcon />
                    <input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="signup-password">Password</label>
                  <div className="input-shell">
                    <LockIcon />
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                    >
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}

                <button type="submit" className="submit-btn" disabled={isSubmitting || isGoogleLoading}>
                  {isSubmitting && <Spinner />}
                  {isSubmitting ? 'Creating workspace…' : 'Create workspace'}
                </button>
              </form>

              <div className="auth-divider" role="separator">
                <span>or</span>
              </div>

              <button
                type="button"
                className="google-btn"
                onClick={handleGoogle}
                disabled={isGoogleLoading || isSubmitting}
              >
                {isGoogleLoading ? <Spinner /> : <GoogleIcon />}
                {isGoogleLoading ? 'Continuing…' : 'Continue with Google'}
              </button>

              <p>
                Already have an account? <Link to="/">Log in</Link>
              </p>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
