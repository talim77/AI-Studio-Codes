import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  FileText,
  PlusCircle,
  Stethoscope,
  FlaskConical,
  Users,
  Settings,
  ShieldAlert,
  Lock,
  ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate }) => {
  const { currentUser } = useAuth();
  const isOwner = currentUser?.role === 'owner';

  const navItems = [
    {
      id: 'dashboard',
      label: 'Lab Dashboard',
      subtitle: 'Overview & metrics',
      icon: Activity,
      restricted: false,
    },
    {
      id: 'reports',
      label: 'Reports & History',
      subtitle: 'Patient records & tracking',
      icon: FileText,
      restricted: false,
    },
    {
      id: 'new-report',
      label: 'Fill Test Report',
      subtitle: 'New intake & parameter entry',
      icon: PlusCircle,
      restricted: false,
    },
    {
      id: 'doctors',
      label: 'Referring Doctors',
      subtitle: 'Referral tracking & records',
      icon: Stethoscope,
      restricted: false,
    },
    {
      id: 'catalog',
      label: 'Test Catalog',
      subtitle: 'Normal ranges & pricing',
      icon: FlaskConical,
      restricted: false,
    },
    {
      id: 'staff',
      label: 'Staff & PINs',
      subtitle: 'Manage IDs, PINs & access',
      icon: Users,
      restricted: true, // Owner only
    },
    {
      id: 'settings',
      label: 'Lab Profile & Print',
      subtitle: 'Header, address & NABL',
      icon: Settings,
      restricted: true, // Owner only
    },
  ];

  return (
    <aside className="no-print w-64 bg-slate-900 text-slate-300 shrink-0 min-h-[calc(100vh-4rem)] flex flex-col justify-between border-r border-slate-800">
      <div className="p-4 space-y-6">
        {/* Navigation list */}
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Main Workspace
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            const isLocked = item.restricted && !isOwner;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors group ${
                  isActive
                    ? 'bg-cyan-600/20 text-cyan-300 font-semibold border-l-2 border-cyan-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <div className="truncate">
                    <span className="block text-xs font-medium tracking-tight text-inherit truncate">
                      {item.label}
                    </span>
                    <span className="block text-[10px] text-slate-500 group-hover:text-slate-400 truncate">
                      {item.subtitle}
                    </span>
                  </div>
                </div>

                {isLocked ? (
                  <span
                    className="p-1 text-amber-400/80 hover:text-amber-300"
                    title="Owner Permission Required"
                  >
                    <Lock className="w-3.5 h-3.5" />
                  </span>
                ) : (
                  <ChevronRight
                    className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${
                      isActive ? 'opacity-100 text-cyan-400' : 'text-slate-600'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Role permission info box */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 text-xs">
          <div className="flex items-center gap-2 mb-1">
            {isOwner ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
            )}
            <span className="font-semibold text-slate-200 text-xs">
              {isOwner ? 'Owner Mode Active' : 'Staff Mode (Limited)'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {isOwner
              ? 'Owner ke paas full permissions hain: reports delete karna, pricing change karna, naye staff IDs/PINs banana.'
              : 'Staff entries aur test reports fill aur print kar sakta hai; reports delete ya settings change karna blocked hai.'}
          </p>
        </div>
      </div>
    </aside>
  );
};
