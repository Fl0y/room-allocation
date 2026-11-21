import type { ReactNode } from 'react';

export const metadata = { title: 'RoomAllocation', description: 'Alocarea sălilor universitare' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ro">
      <body>{children}</body>
    </html>
  );
}
