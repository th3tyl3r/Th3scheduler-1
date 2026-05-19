import type { Metadata } from 'next';
import './globals.css';
import ThemeProvider from './components/ThemeProvider';
import { AppModeProvider } from './context/AppModeContext';

export const metadata: Metadata = {
  title: 'Scheduler',
  description: 'Electrician Scheduler App',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <AppModeProvider>
            {children}
          </AppModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}