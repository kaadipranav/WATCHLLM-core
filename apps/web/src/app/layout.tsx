import type { Metadata } from 'next';
import { Space_Grotesk, IBM_Plex_Mono } from 'next/font/google';
import { AuthProvider } from '../lib/auth-context';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'WatchLLM — Break AI Agents Before Production Does', template: '%s | WatchLLM' },
  description:
    'WatchLLM stress-tests your AI agents with adversarial simulations, captures replayable trace graphs, and helps teams iteratively harden agents before deployment.',
  keywords: ['AI agent testing', 'LLM security', 'adversarial simulation', 'agent reliability', 'prompt injection testing'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://watchllm.dev',
    siteName: 'WatchLLM',
    title: 'WatchLLM — Agent Reliability Platform',
    description: 'Break AI agents before users do. Adversarial simulation, trace graphs, fork-and-replay debugging.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WatchLLM',
    description: 'Agent Reliability Platform — break AI before users do.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): JSX.Element {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${ibmPlexMono.variable}`}>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
