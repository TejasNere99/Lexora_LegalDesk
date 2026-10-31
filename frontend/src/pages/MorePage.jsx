import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Smartphone,
  Shield,
  HelpCircle,
  Briefcase,
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { Avatar, Card, PageHeader } from '../components/ui';
import { InstallPrompt } from '../components/layout/InstallPrompt';

export default function MorePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const MENU_ITEMS = [
    { to: '/app/hearings', label: 'Court Hearings & Calendar', icon: CalendarDays, desc: 'Upcoming listings & order history' },
    { to: '/app/team', label: 'Practice Team & Access', icon: Users, desc: 'Colleague roles & audit trail' },
    { to: '/app/reports', label: 'Practice Insights & Workload', icon: BarChart3, desc: 'Matter status & completed tasks' },
    { to: '/app/settings', label: 'Account Settings & Security', icon: Settings, desc: 'Profile, passwords & PWA instructions' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="More Options" subtitle="Secondary workspace views and device settings." />

      {/* User Card */}
      <Card className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={user?.name} />
          <div>
            <p className="font-semibold text-navy">{user?.name}</p>
            <p className="text-xs text-muted">{user?.email}</p>
          </div>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary capitalize">
          {user?.role}
        </span>
      </Card>

      {/* Quick Navigation Cards */}
      <div className="space-y-2">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.to}
            type="button"
            onClick={() => navigate(item.to)}
            className="flex w-full items-center gap-4 rounded-card bg-white p-4 text-left shadow-card transition hover:border-primary active:bg-cream"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-primary/10 text-primary">
              <item.icon size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-navy">{item.label}</p>
              <p className="text-xs text-muted">{item.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* PWA Install Prompt */}
      <InstallPrompt />

      {/* Sign Out Action */}
      <Card>
        <button
          type="button"
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
          className="flex w-full items-center justify-center gap-2 rounded-control bg-red-50 py-3 text-sm font-semibold text-danger hover:bg-red-100"
        >
          <LogOut size={16} /> Sign out of workspace
        </button>
      </Card>
    </div>
  );
}
