import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  CalendarDays,
  CheckSquare,
  Home,
  MoreHorizontal,
  Plus,
  Scale,
  Settings,
  Users,
  BarChart3,
  UserCircle2,
  LogOut,
  Menu,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { Avatar, IconButton } from '../ui';

const NAV = [
  { to: '/app', label: 'Dashboard', icon: Home, end: true },
  { to: '/app/clients', label: 'Clients', icon: UserCircle2 },
  { to: '/app/cases', label: 'Cases', icon: Briefcase },
  { to: '/app/hearings', label: 'Hearings', icon: CalendarDays },
  { to: '/app/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/app/team', label: 'Team', icon: Users },
  { to: '/app/reports', label: 'Reports', icon: BarChart3 },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

const MOBILE = [
  { to: '/app', label: 'Home', icon: Home, end: true },
  { to: '/app/cases', label: 'Cases', icon: Briefcase },
  { to: '/app/clients', label: 'Clients', icon: UserCircle2 },
  { to: '/app/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/app/more', label: 'More', icon: MoreHorizontal },
];

function itemClass({ isActive }) {
  return `flex items-center gap-3 rounded-control px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-primary text-white' : 'text-navy hover:bg-cream'
  }`;
}

export function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const current = NAV.find((item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)));

  return (
    <div className="min-h-screen bg-cream">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-white p-4 lg:flex lg:flex-col">
        <div className="mb-6 flex items-center gap-2 px-2">
          <Scale className="text-primary" />
          <div>
            <p className="font-display text-lg font-extrabold">Lexora</p>
            <p className="text-xs text-muted">LegalDesk</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={itemClass}>
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 flex items-center justify-between rounded-card bg-cream p-3">
          <div className="flex items-center gap-2">
            <Avatar name={user?.name} />
            <div>
              <p className="text-sm font-semibold">{user?.name}</p>
              <p className="text-xs capitalize text-muted">{user?.role}</p>
            </div>
          </div>
          <IconButton
            label="Sign out"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
          >
            <LogOut size={18} />
          </IconButton>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-cream/90 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <IconButton className="lg:hidden" label="Open menu" onClick={() => setOpen((v) => !v)}>
              <Menu />
            </IconButton>
            <div>
              <p className="text-xs text-muted">Lexora LegalDesk</p>
              <h1 className="text-lg font-semibold">{current?.label || 'Workspace'}</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/app/cases/new')}
            className="inline-flex h-11 items-center gap-2 rounded-control bg-primary px-3 text-sm font-semibold text-white"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New case</span>
          </button>
        </header>
        {open ? (
          <div className="border-b border-line bg-white p-3 lg:hidden">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={itemClass} onClick={() => setOpen(false)}>
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </div>
        ) : null}
        <main className="mx-auto max-w-6xl px-4 py-6 pb-28 lg:pb-10">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-white px-2 py-2 safe-bottom lg:hidden">
        {MOBILE.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 rounded-control py-1 text-[11px] ${isActive ? 'text-primary' : 'text-muted'}`
            }
          >
            <item.icon size={20} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
