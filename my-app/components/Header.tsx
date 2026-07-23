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
  '/member/dashboard':        'My Dashboard',
  '/member/requests':         'Benefits & Assistance',
  '/treasurer/dashboard':     'Dashboard',
  '/treasurer/collections':   'Collections',
  '/treasurer/disbursement':  'Disbursement',
  '/treasurer/loans':         'Loan Ledger',
  '/treasurer/funds':         'Funds',
  '/treasurer/forecasting':   'AI Forecasting',
  '/admin/dashboard':         'User Management',
  '/admin/settings':          'Settings',
  '/auditor/dashboard':       'Audit Oversight',
  '/auditor/disbursement':    'Disbursement',
  '/profile':                 'Settings',
  '/events':                  'Events',
  '/documents':               'Documents',
  '/election':                'Elections',
  '/grievance':               'Grievances',
};

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
  
  // Show Greeting for dashboards, otherwise show page title
  let title = PAGE_TITLES[pathname] ?? 'BDOEA';

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
      className="glass-sheen sticky top-0 z-40 flex items-center justify-between pl-16 md:pl-5 pr-4 py-2.5 bg-white/60 backdrop-blur-[40px] backdrop-saturate-[200%] border-b border-white/80 print:hidden will-change-auto"
      style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.8) inset, 0 8px 32px rgba(4,21,45,0.1)' }}
    >
      <style jsx global>{`
        .glass-sheen { position: relative; isolation: isolate; }
        .glass-sheen::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(140% 140% at 50% -30%, rgba(255,255,255,0.5), rgba(255,255,255,0) 60%);
          pointer-events: none;
          z-index: -1;
        }
        /* Header is intentionally static: no transform/scale on hover, ever */
        header.glass-sheen, header.glass-sheen * { transform: none; }
        header.glass-sheen button, header.glass-sheen a { transform: none !important; }
      `}</style>

      <h1 className="text-[13px] font-black text-[#04152d] tracking-tight select-none text-left">
        {title}
      </h1>

      <div className="flex items-center gap-3">
        {(currentDate && currentTime) && (
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-bold text-gray-600 tracking-wide mr-1 bg-white/50 border border-white/70 rounded-full px-3 py-1.5 backdrop-blur-md">
            <span>{currentDate}</span>
            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
            <span>{currentTime}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <div className="relative" ref={wrapperRef}>
            <button
              onClick={() => setPanelOpen(o => !o)}
              className="relative flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 border border-transparent hover:text-[#04152d] hover:bg-white/80 hover:border-white hover:shadow-[0_2px_10px_rgba(0,0,0,0.06)] transition-colors transition-shadow duration-300"
              title="Notifications"
              aria-label="Toggle notifications"
              suppressHydrationWarning
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[8px] font-black rounded-full min-w-[13px] h-3.5 flex items-center justify-center px-0.5 leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          <Link
            href="/profile"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 border border-transparent hover:text-[#04152d] hover:bg-white/80 hover:border-white hover:shadow-[0_2px_10px_rgba(0,0,0,0.06)] transition-colors transition-shadow duration-300"
            title="Settings"
            suppressHydrationWarning
          >
            <Settings size={17} />
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Header(props: Props) {
  return (
    <Suspense fallback={
      <header
        className="sticky top-0 z-40 flex items-center justify-between pl-16 md:pl-5 pr-4 py-2.5 bg-white/60 backdrop-blur-[40px] border-b border-white/80 print:hidden"
        style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.8) inset, 0 8px 32px rgba(4,21,45,0.1)' }}
      >
        <h1 className="text-[13px] font-black text-[#04152d] tracking-tight select-none">BDOEA</h1>
      </header>
    }>
      <HeaderContent {...props} />
    </Suspense>
  );
}