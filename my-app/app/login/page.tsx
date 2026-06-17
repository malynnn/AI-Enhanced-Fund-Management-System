"use client";

export const dynamic = 'force-dynamic';

import { useState, Suspense } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import Image from "next/image"; 

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorUrl = searchParams.get("error");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [detectedRole, setDetectedRole] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    const res = await signIn("credentials", {
      redirect: false,
      username,
      password,
    });

    if (res?.error) {
      setErrorMessage("Invalid credentials.");
      setIsLoading(false);
    } else {
      const session = await getSession();
      // Default to "Member" if role is undefined
      const userRole = (session?.user as any)?.role || "Member"; 
      
      setDetectedRole(userRole);

      setTimeout(() => {
        // EXACT ROLE-BASED ROUTING TO NEW FOLDERS
        if (userRole === "Member" || userRole === "User") {
          router.push("/member/dashboard");
        } else if (userRole === "Auditor") {
          router.push("/auditor/dashboard");
        } else {
          // Admin, Treasurer, Officer go to the Treasurer workspace
          router.push("/treasurer/dashboard");
        }
        router.refresh();
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen w-full flex font-sans">
      
      {/* LEFT COLUMN: Logo */}
      <div className="hidden lg:flex w-1/2 bg-[#f8f9fa] items-center justify-center p-12">
        <Image 
          src="/bdoea-logo-blue.png" 
          alt="BDOEA Logo" 
          width={450} 
          height={250} 
          priority
          className="object-contain"
        />
      </div>

      {/* RIGHT COLUMN: Login Form Area */}
      <div className="w-full lg:w-1/2 bg-[#021124] flex items-center justify-center p-8">
        <div className="bg-[#f8f9fa] w-full max-w-md rounded-md p-10 lg:p-12 shadow-xl">
          
          <h2 className="text-[2.5rem] leading-none font-bold text-black mb-8 tracking-tight">
            Log In
          </h2>

          {/* Error Display */}
          {(errorMessage || errorUrl) && (
            <div className="mb-6 bg-red-100 text-red-700 p-3 rounded flex items-start gap-2 text-sm font-bold">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p>{errorMessage || "Authentication failed."}</p>
            </div>
          )}

          {/* Role Success Display */}
          {detectedRole && (
            <div className="mb-6 bg-green-100 text-green-800 p-4 rounded flex items-center gap-3 text-sm font-bold border border-green-200">
              <CheckCircle2 size={24} className="text-green-600 shrink-0" />
              <div>
                <p>Authentication Successful!</p>
                <p className="font-medium text-green-700 mt-0.5">Logging you in as: <span className="font-black uppercase">{detectedRole}</span></p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">Employee ID / Email</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={!!detectedRole}
                className="w-full p-3 bg-white border border-gray-200 rounded text-sm focus:ring-2 focus:ring-[#021124] outline-none transition-all disabled:opacity-50"
                placeholder="Example: member, admin, treasurer, auditor, superadmin"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!!detectedRole}
                className="w-full p-3 bg-white border border-gray-200 rounded text-sm focus:ring-2 focus:ring-[#021124] outline-none transition-all disabled:opacity-50"
                placeholder="Enter any password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !!detectedRole}
              className="w-full bg-[#021124] text-white p-3.5 mt-4 rounded font-semibold text-sm hover:bg-black transition-all active:scale-[0.99] flex justify-center items-center gap-2 disabled:opacity-70"
            >
              {isLoading && !detectedRole ? (
                <><Loader2 size={18} className="animate-spin" /> Verifying...</>
              ) : detectedRole ? (
                "Redirecting..."
              ) : (
                "Login"
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center bg-[#021124] text-white">
        <Loader2 className="animate-spin" size={32} />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}