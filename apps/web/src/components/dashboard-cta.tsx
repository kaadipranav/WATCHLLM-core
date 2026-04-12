'use client';

import Link from 'next/link';
import { useAuth } from '../lib/auth-context';

type DashboardCtaProps = {
  className: string;
  signedOutLabel?: string;
  signedInLabel?: string;
  dashboardHref?: string;
};

export function DashboardCta({
  className,
  signedOutLabel = 'Sign in',
  signedInLabel = 'Open dashboard',
  dashboardHref = '/dashboard',
}: DashboardCtaProps): JSX.Element {
  const { user, loginWithGitHub } = useAuth();

  if (user) {
    return (
      <Link className={className} href={dashboardHref}>
        {signedInLabel}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={loginWithGitHub}>
      {signedOutLabel}
    </button>
  );
}