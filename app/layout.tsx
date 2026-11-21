import type { ReactNode } from 'react';
import './globals.css';
import s from './ui.module.css';

export const metadata = { title: 'RoomAllocation', description: 'Alocarea sălilor universitare' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ro">
      <body>
        <header className={s.header}>
          <a href="/" className={s.brand}>
            RoomAllocation
          </a>
          <nav className={s.nav} aria-label="Roluri">
            <a href="/profesor">Profesor</a>
            <a href="/studenti">Studenți</a>
            <a href="/admin">Administrator</a>
          </nav>
        </header>
        <main className={s.main}>{children}</main>
      </body>
    </html>
  );
}
