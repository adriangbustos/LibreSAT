import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from './context/AppContext';

export const metadata: Metadata = {
  title: 'LibreSAT',
  description: 'Full-featured Digital SAT Practice Exam platform with QuestionDex, analytics, and adaptive exam engine.',
  keywords: 'SAT, practice, exam, College Board, reading, math, test prep',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href='https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css' rel='stylesheet' />
        <style dangerouslySetInnerHTML={{ __html: `::highlight(sat-highlight) { background-color: rgba(253, 224, 71, 0.7); color: inherit; }` }} />
      </head>
      <body className="min-h-screen antialiased">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
