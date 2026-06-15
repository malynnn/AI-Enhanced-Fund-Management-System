'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { Bell, Settings } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Props {
  unreadCount?: number;
  onUnreadCountChange?: (count: number) => void;
}

const ADMIN_TAB_TITLES: Record<string, string> = {
  members:               'Members',
  'pending-approvals':   'Pending Approvals',
  'create-officer':      'Add Officer',
  'create-member':       'Add Member',
  'beneficiary-requests':'Beneficiary Requests',
  events:                'Events',
  claims:                'Claims',
  activity:              'Activity Log',
  users:                 'User Management',
};

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':               'Dashboard',
  '/admin/dashboard':         'Dashboard',
  '/finance/dashboard':       'Fund Overview',
  '/finance/dues':            'Dues Collection',
  '/finance/disbursement':    'Disbursement Control Center',
  '/finance/loans':           'Loan Ledger',
  '/finance/funds':           'Fund Management',
  '/finance/budget':          'Budget Monitoring',
  '/finance/config/accounts': 'Chart of Accounts',
  '/finance/reports':         'Reports Center',
  '/finance/reconciliation':  'Bank Reconciliation',
  '/finance/config':          'System Config',
  '/finance/audit':           'Audit Logs',
  '/finance/expenses':        'Expenses & Petty Cash',
  '/profile':                 'Settings',
  '/member':                  'Member Profile',
  '/beneficiaries':           'Beneficiaries',
  '/benefits':                'Benefits',
  '/events':                  'Events',
  '/loan-center':             'Loan Center',
  '/documents':               'Documents',
  '/election':                'Elections',
  '/grievance':               'Grievances',
};

// Inner component — uses useSearchParams, must be inside Suspense boundary
function HeaderContent({ unreadCount = 0 }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [panelOpen, setPanelOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [greeting, setGreeting] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateDateTime = () => {
      const date = new Date();
      const hour = date.getHours();

      if (hour < 12) setGreeting('Good morning');
      else if (hour < 18) setGreeting('Good afternoon');
      else setGreeting('Good evening');

      setCurrentDate(date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
      setCurrentTime(date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };

    updateDateTime();
    const timerId = setInterval(updateDateTime, 1000);
    return () => clearInterval(timerId);
  }, []);

  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'Member';
  const isMemberDashboard = pathname === '/';

  let title = isMemberDashboard
    ? `${greeting}, ${userName}`
    : (PAGE_TITLES[pathname] ?? 'BDOEA');

  if (pathname === '/admin') {
    const tab = searchParams.get('tab') ?? '';
    title = ADMIN_TAB_TITLES[tab] ?? 'Administration';
  }

  useEffect(() => {
    if (!panelOpen) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [panelOpen]);

  useEffect(() => { setPanelOpen(false); }, [pathname]);

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between pl-16 md:pl-6 pr-4 py-3 bg-white/85 backdrop-blur-md border-b border-gray-200 print:hidden"
      style={{ boxShadow: '0 1px 6px rgba(4,21,45,0.07)' }}
    >
      <h1 className="text-base font-black text-[#04152d] tracking-tight select-none">
        {title}
      </h1>

      <div className="flex items-center gap-4">
        {(currentDate && currentTime) && (
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-gray-600 tracking-wide mr-1">
            <span>{currentDate}</span>
            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
            <span>{currentTime}</span>
          </div>
        )}

        <div className="flex items-center gap-1">
          <div className="relative" ref={wrapperRef}>
            <button
              onClick={() => setPanelOpen(o => !o)}
              className="relative flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 hover:text-[#04152d] hover:bg-gray-100 transition-colors"
              title="Notifications"
              aria-label="Toggle notifications"
              suppressHydrationWarning
            >
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[8px] font-black rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5 leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          <Link
            href="/profile"
            className="flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 hover:text-[#04152d] hover:bg-gray-100 transition-colors"
            title="Settings"
            suppressHydrationWarning
          >
            <Settings size={19} />
          </Link>
        </div>
      </div>
    </header>
  );
}

// Exported Header: wraps HeaderContent in Suspense so useSearchParams is safe for SSR/prerender
export default function Header(props: Props) {
  return (
    <Suspense fallback={
      <header
        className="sticky top-0 z-40 flex items-center justify-between pl-16 md:pl-6 pr-4 py-3 bg-white/85 backdrop-blur-md border-b border-gray-200 print:hidden"
        style={{ boxShadow: '0 1px 6px rgba(4,21,45,0.07)' }}
      >
        <h1 className="text-base font-black text-[#04152d] tracking-tight select-none">BDOEA</h1>
      </header>
    }>
      <HeaderContent {...props} />
    </Suspense>
  );
}