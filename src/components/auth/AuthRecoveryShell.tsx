import type { ReactNode } from 'react';

export function AuthRecoveryShell({ title, description, children }: { title: ReactNode; description?: string; children: ReactNode }) {
  return <section className="auth-recovery">
    <header className="auth-recovery__heading">
      <span>// AEVIC SECURE ACCESS</span>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </header>
    <div className="auth-recovery__card">{children}</div>
  </section>;
}
