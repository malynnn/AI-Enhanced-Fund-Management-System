import Image from 'next/image';
import Link from 'next/link';
import { Home, Bell, Calendar, CreditCard, CircleDollarSign, Book, LogOut } from 'lucide-react';

export default function Sidebar() {
  const navItems = [
    { label: 'Dashboard', href: '#', icon: Home },
    { label: 'Notification', href: '#', icon: Bell },
    { label: 'Events', href: '#', icon: Calendar },
    { label: 'My Membership', href: '#', icon: CreditCard },
    { label: 'Loan Center', href: '#', icon: CircleDollarSign },
    { label: 'Finance & Dues', href: '/', active: true, icon: Book }, // Set active for this mockup
  ];

  return (
    <div className="flex flex-col h-full bg-bdoea-navy text-white px-6 py-8">
      {/* Logo */}
      <div className="mb-12 flex justify-center">
        <Image 
          src="/BDOEA Logo.png" 
          alt="BDOEA Logo" 
          width={180} 
          height={60} 
          priority 
          className="object-contain"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon; // Extract the icon component
          return (
            <Link 
              key={item.label} 
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3 rounded-md transition-colors font-medium text-sm ${
                item.active ? 'bg-white/10 border-l-4 border-bdoea-yellow' : 'hover:bg-white/5 opacity-80 hover:opacity-100'
              }`}
            >
              {/* Render the Lucide Icon */}
              <Icon size={20} className={item.active ? "text-bdoea-yellow" : "text-gray-300"} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User Profile & Logout */}
      <div className="mt-auto pt-6">
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="w-10 h-10 rounded-full bg-gray-300 flex-shrink-0" />
          <div className="overflow-hidden">
            <p className="text-[10px] tracking-wider uppercase opacity-60 m-0 leading-tight">Surname</p>
            <p className="text-sm font-bold truncate leading-tight">VEN</p>
          </div>
        </div>
        <button className="w-full py-2.5 bg-bdoea-yellow hover:bg-yellow-500 text-black font-semibold text-sm rounded-md transition-colors flex items-center justify-center gap-2">
          <LogOut size={16} strokeWidth={2.5} /> Log out
        </button>
      </div>
    </div>
  );
}