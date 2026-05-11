"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Loader2, CheckCircle2, Mail, ArrowLeft } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorUrl = searchParams.get("error");

  // Step Management: 1 = Credentials, 2 = Verification Code
  const [step, setStep] = useState<1 | 2>(1);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [detectedRole, setDetectedRole] = useState<string | null>(null);

  // --- STEP 1: Verify Credentials & Trigger Email ---
  const handleRequestVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      /* =========================================
        BACKEND DEV NOTE: API CALL 1 GOES HERE
        =========================================
        Here, fetch to your backend to verify the username/password.
        If valid, the backend should generate the 6-digit code, 
        email it to the user, and return a success status (200 OK).

        Example:
        const res = await fetch(`${process.env.NEXT_PUBLIC_MS_API_URL}/auth/trigger-2fa`, { ... });
        if (!res.ok) throw new Error("Invalid credentials");
      */

      // Simulating network delay for the email trigger
      await new Promise(resolve => setTimeout(resolve, 800));

      // If credentials are correct, move to Step 2 (OTP Input)
      setStep(2);
    } catch (error: any) {
      setErrorMessage("Invalid Employee ID or password.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- STEP 2: Submit OTP to NextAuth ---
  const handleFinalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    // Send everything to NextAuth (which talks to the backend in route.ts)
    const res = await signIn("credentials", {
      redirect: false,
      username,
      password,
      otp, // Passing the verification code
    });

    if (res?.error) {
      setErrorMessage(res.error === "CredentialsSignin" ? "Invalid verification code." : res.error);
      setIsLoading(false);
    } else {
      const session = await getSession();
      const userRole = (session?.user as any)?.role || "User";
      
      setDetectedRole(userRole);

      setTimeout(() => {
        router.push("/finance/dashboard");
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

      {/* RIGHT COLUMN: Auth Area */}
      <div className="w-full lg:w-1/2 bg-[#021124] flex items-center justify-center p-8">
        <div className="bg-[#f8f9fa] w-full max-w-md rounded-md p-10 lg:p-12">
          
          <h2 className="text-[2.5rem] leading-none font-bold text-black mb-2 tracking-tight">
            {step === 1 ? "Log In" : "Verify Identity"}
          </h2>
          <p className="text-sm text-gray-500 mb-8 font-medium">
            {step === 1 
              ? "Access the BDOEA Financial System" 
              : "A verification code was sent to your registered email address."}
          </p>

          {/* Error Display */}
          {(errorMessage || errorUrl) && (
            <div className="mb-6 bg-red-100 text-red-700 p-3 rounded flex items-start gap-2 text-sm font-bold">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p>{errorMessage || "Authentication failed. Please try again."}</p>
            </div>
          )}

          {/* Success Display */}
          {detectedRole && (
            <div className="mb-6 bg-green-100 text-green-800 p-4 rounded flex items-center gap-3 text-sm font-bold border border-green-200">
              <CheckCircle2 size={24} className="text-green-600 shrink-0" />
              <div>
                <p>Authentication Successful!</p>
                <p className="font-medium text-green-700 mt-0.5">Logging you in as: <span className="font-black uppercase">{detectedRole}</span></p>
              </div>
            </div>
          )}

          {/* STEP 1 FORM: Credentials */}
          {step === 1 && (
            <form onSubmit={handleRequestVerification} className="space-y-5">
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Employee ID</label>
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
                <label className="block text-sm text-gray-700 mb-1.5">Password</label>
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
                <a href="#" className="text-sm font-bold text-[#021124] hover:underline">Forgot Password?</a>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#021124] text-white p-3.5 mt-2 rounded font-semibold text-sm hover:bg-black transition-all active:scale-[0.99] flex justify-center items-center gap-2 disabled:opacity-70"
              >
                {isLoading ? <><Loader2 size={18} className="animate-spin" /> Verifying...</> : "Continue to Verification"}
              </button>
            </form>
          )}

        {/* STEP 2 FORM: OTP Verification */}
          {step === 2 && (
            <form onSubmit={handleFinalLogin} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-md flex items-center gap-3 text-blue-800 mb-2">
                <Mail size={24} className="opacity-70" />
                <span className="text-xs font-semibold">Check your inbox. Code expires in 5 minutes.</span>
              </div>

              <div>
                {/* Changed to 4-Digit Code */}
                <label className="block text-sm font-bold text-[#021124] mb-1.5">4-Digit Code</label>
                <input
                  type="text"
                  required
                  maxLength={4} // Enforce 4 characters maximum
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // Forces numbers only
                  className="w-full p-3.5 bg-white border-2 border-gray-200 rounded text-center text-xl tracking-[1em] font-mono focus:ring-2 focus:ring-[#021124] focus:border-[#021124] outline-none transition-all uppercase"
                  placeholder="----" // 4 dashes
                />
              </div>

              <button
                type="submit"
                // Require exactly 4 digits to enable the button
                disabled={isLoading || otp.length < 4 || !!detectedRole}
                className="w-full bg-[#021124] text-white p-3.5 mt-4 rounded font-semibold text-sm hover:bg-black transition-all active:scale-[0.99] flex justify-center items-center gap-2 disabled:opacity-70"
              >
                {isLoading && !detectedRole ? <><Loader2 size={18} className="animate-spin" /> Authenticating...</> : detectedRole ? "Redirecting..." : "Verify & Login"}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isLoading || !!detectedRole}
                className="w-full mt-2 text-sm text-gray-500 font-medium hover:text-black flex justify-center items-center gap-2 transition-colors"
              >
                <ArrowLeft size={14} /> Back to login
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}