import { lazy, Suspense, type ReactNode } from 'react';

const AuthScene = lazy(() => import('./AuthScene'));

type AuthVisualProps = {
  title: ReactNode;
  copy: string;
};

export default function AuthVisual({ title, copy }: AuthVisualProps) {
  return (
    <section className="login-visual">
      <Suspense fallback={<div className="auth-scene" aria-hidden="true" />}>
        <AuthScene />
      </Suspense>
      <div className="login-visual-content">
        <p className="login-brand">Framewise</p>
        <h1 className="login-visual-title">{title}</h1>
        <p className="login-visual-copy">{copy}</p>
      </div>
    </section>
  );
}
