import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BDOEA Financial System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex h-screen overflow-hidden bg-bdoea-bg`}>
        {/* Fixed Left Panel */}
        <aside className="w-[260px] h-full flex-shrink-0 shadow-xl z-10">
          <Sidebar />
        </aside>

        {/* Scrollable Main Panel */}
        <main className="flex-1 h-full overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}