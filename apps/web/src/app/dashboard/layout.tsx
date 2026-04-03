import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { api, ApiRequestError } from '@/lib/api-client';

async function requireAuthSession() {
  try {
    const cookieHeader = cookies().toString();
    const session = await api.auth.sessionServer(cookieHeader);

    if (!session) {
      redirect('/sign-in');
    }
  } catch (error) {
    if (error instanceof ApiRequestError && error.code === 401) {
      redirect('/sign-in');
    }

    throw error;
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuthSession();

  return (
    <div className="flex min-h-screen bg-bg text-text-primary">
      <DashboardSidebar />
      <main className="flex-1 p-5">{children}</main>
    </div>
  );
}