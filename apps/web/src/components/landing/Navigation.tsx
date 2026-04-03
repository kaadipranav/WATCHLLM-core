'use client';

import { Button } from '@/components/ui/Button';
import { useScrolled } from '@/hooks/useScrolled';

export function Navigation() {
  const scrolled = useScrolled(8);

  return (
    <header
      className={`sticky top-0 z-50 h-14 border-b transition-all duration-150 ease-in-out ${
        scrolled ? 'border-border bg-bg/80 backdrop-blur-md' : 'border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-6">
        <span className="font-mono font-semibold text-text-primary">WatchLLM</span>

        <nav className="hidden items-center gap-8 text-sm text-text-secondary md:flex">
          <a href="#product" className="transition-colors duration-150 ease-in-out hover:text-text-primary">
            Product
          </a>
          <a href="/docs" className="transition-colors duration-150 ease-in-out hover:text-text-primary">
            Docs
          </a>
          <a href="#pricing" className="transition-colors duration-150 ease-in-out hover:text-text-primary">
            Pricing
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" href="/sign-in">
            Sign in
          </Button>
          <Button variant="accent" href="/sign-up">
            Get started
          </Button>
        </div>
      </div>
    </header>
  );
}