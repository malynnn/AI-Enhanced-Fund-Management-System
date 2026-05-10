import FinanceTopNav from "@/components/FinanceTopNav";

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      
      {/* The Edge-to-Edge Dark Grey Tab Bar */}
      <FinanceTopNav />

      {/* The Page Content Below */}
      <div className="flex-1 p-8 overflow-y-auto">
        {children}
      </div>
      
    </div>
  );
}