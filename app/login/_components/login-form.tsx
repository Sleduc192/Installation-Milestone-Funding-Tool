"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Sun, Mail, Lock, User, Building2, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

export default function LoginForm() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "", company: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const res = await signIn("credentials", {
          email: form.email,
          password: form.password,
          redirect: false,
        });
        if (res?.error) {
          toast.error("Invalid email or password");
        } else {
          router.replace("/dashboard");
        }
      } else {
        const res = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data?.error ?? "Signup failed");
        } else {
          const loginRes = await signIn("credentials", {
            email: form.email,
            password: form.password,
            redirect: false,
          });
          if (loginRes?.error) {
            toast.error("Account created but login failed. Please sign in.");
            setIsLogin(true);
          } else {
            router.replace("/dashboard");
          }
        }
      }
    } catch (err: any) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f2439] via-[#1a3a5c] to-[#0d1f33] px-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center">
              <Sun className="w-7 h-7 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-display font-bold text-white tracking-tight">LightReach</h1>
              <p className="text-xs text-amber-400 font-mono">M1 SUBMISSION TOOL</p>
            </div>
          </div>
          <p className="text-blue-200/70 text-sm">AI-powered photo review for solar installation milestones</p>
        </div>

        <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-xl font-display">
              {isLogin ? "Welcome Back" : "Create Account"}
            </CardTitle>
            <CardDescription className="text-blue-200/60">
              {isLogin ? "Sign in to review your submissions" : "Join to start submitting photo packs"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label className="text-blue-100/80 text-sm">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300/50" />
                      <Input
                        value={form.name}
                        onChange={(e: any) => setForm({ ...form, name: e?.target?.value ?? "" })}
                        placeholder="Your full name"
                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-blue-200/30"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-blue-100/80 text-sm">Company</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300/50" />
                      <Input
                        value={form.company}
                        onChange={(e: any) => setForm({ ...form, company: e?.target?.value ?? "" })}
                        placeholder="Installation company"
                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-blue-200/30"
                      />
                    </div>
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label className="text-blue-100/80 text-sm">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300/50" />
                  <Input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e: any) => setForm({ ...form, email: e?.target?.value ?? "" })}
                    placeholder="you@company.com"
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-blue-200/30"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-blue-100/80 text-sm">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300/50" />
                  <Input
                    type="password"
                    required
                    value={form.password}
                    onChange={(e: any) => setForm({ ...form, password: e?.target?.value ?? "" })}
                    placeholder="••••••••"
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-blue-200/30"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold py-3"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4 animate-pulse" />
                    {isLogin ? "Signing in..." : "Creating account..."}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {isLogin ? "Sign In" : "Create Account"}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-amber-400/80 hover:text-amber-400 text-sm transition-colors"
              >
                {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
