import { Sidebar } from '@/widgets/sidebar';
import { LogoutButton } from '@/features/auth/logout';
import { getCurrentUser } from '@/entities/session';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen">
      <Sidebar userName={user.name} logoutSlot={<LogoutButton />} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
