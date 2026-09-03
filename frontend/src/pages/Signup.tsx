import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiPost } from '../api/client';

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

                <button type="submit" className="submit-btn" disabled={isSubmitting}>
                  {isSubmitting && <Spinner />}
                  {isSubmitting ? 'Creating workspace…' : 'Create workspace'}
                </button>
              </form>

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
