"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

function SignUpForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const message = searchParams.get("message");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    try {
      await signUp(formData);
    } catch {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(120,119,198,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(59,130,246,0.1),transparent_50%)]" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-5"
                >
                  <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
                </svg>
              </div>
              <span className="text-lg font-semibold tracking-tight">
                JobFlow AI
              </span>
            </div>
          </div>
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-xl font-medium text-zinc-200">
                Get started in minutes
              </h2>
              <div className="space-y-3">
                {[
                  {
                    icon: "⚡",
                    title: "AI-Powered Applications",
                    desc: "Generate tailored cover letters and resumes",
                  },
                  {
                    icon: "📊",
                    title: "Track Everything",
                    desc: "Monitor all your applications in one place",
                  },
                  {
                    icon: "🎯",
                    title: "Smart Matching",
                    desc: "Find jobs that match your skills perfectly",
                  },
                ].map((feature) => (
                  <div
                    key={feature.title}
                    className="flex items-start gap-3 rounded-lg bg-white/5 p-3 backdrop-blur-sm"
                  >
                    <span className="text-lg">{feature.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">
                        {feature.title}
                      </p>
                      <p className="text-xs text-zinc-400">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="text-xs text-zinc-500">
            © {new Date().getFullYear()} JobFlow AI. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right side — sign-up form */}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2 bg-white dark:bg-zinc-950">
        <div className="w-full max-w-[400px] space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
              >
                <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
              </svg>
            </div>
            <span className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              JobFlow AI
            </span>
          </div>

          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Create an account
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Get started with your AI-powered job search
            </p>
          </div>

          {/* Success message */}
          {message && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/50 dark:text-emerald-400">
              {message}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/50 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Google sign-in */}
          <GoogleSignInButton />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-zinc-400 dark:bg-zinc-950 dark:text-zinc-500">
                or continue with email
              </span>
            </div>
          </div>

          {/* Email/Password form */}
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Email address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="h-11 rounded-lg border-zinc-300 bg-white px-4 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete="new-password"
                className="h-11 rounded-lg border-zinc-300 bg-white px-4 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Must be at least 6 characters
              </p>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isLoading}
              className="w-full h-11 rounded-lg text-sm font-medium"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="size-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creating account...
                </span>
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          {/* Terms */}
          <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
            By creating an account, you agree to our{" "}
            <Link
              href="#"
              className="underline hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="#"
              className="underline hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              Privacy Policy
            </Link>
          </p>

          {/* Sign in link */}
          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">Loading...</div>}>
      <SignUpForm />
    </Suspense>
  );
}
