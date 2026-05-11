"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import Image from "next/image"; 

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
      setErrorMessage(res.error === "CredentialsSignin" ? "Invalid Employee ID or password." : res.error);
      setIsLoading(false);
    } else {
      router.push("/finance/dashboard");
      router.refresh();
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

      {/* RIGHT COLUMN: Login Form */}
      <div className="w-full lg:w-1/2 bg-[#021124] flex items-center justify-center p-8">
        <div className="bg-[#f8f9fa] w-full max-w-md rounded-md p-10 lg:p-12 shadow-2xl">
          
          <h2 className="text-[2.5rem] leading-none font-bold text-black mb-8 tracking-tight">
            Log In
          </h2>

          {errorMessage && (
            <div className="mb-6 bg-red-100 text-red-700 p-3 rounded flex items-start gap-2 text-sm font-bold border border-red-200">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p>{errorMessage}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Employee ID</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 bg-white border border-gray-200 rounded text-sm focus:ring-2 focus:ring-[#021124] outline-none transition-all"
                placeholder="Enter your Employee ID here"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-white border border-gray-200 rounded text-sm focus:ring-2 focus:ring-[#021124] outline-none transition-all"
                placeholder="Enter your password here"
              />
            </div>

            <div className="flex justify-end pt-1">
              <a href="#" className="text-sm font-bold text-[#021124] hover:underline">
                Forgot Password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#021124] text-white p-3.5 mt-2 rounded font-semibold text-sm hover:bg-black transition-all active:scale-[0.99] flex justify-center items-center gap-2 disabled:opacity-70"
            >
              {isLoading ? <><Loader2 size={18} className="animate-spin" /> Verifying...</> : "Login"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-black">
            <span className="font-medium">Don't have an account? </span>
            <a href="#" className="font-bold text-[#021124] hover:underline">Sign up</a>
          </div>

        </div>
      </div>
    </div>
  );
}