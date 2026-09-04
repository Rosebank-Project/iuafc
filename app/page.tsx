'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Church, Lock, User as UserIcon, Loader2 } from 'lucide-react';
import { useChurch } from '@/lib/church-context';
import type { Role } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

const ROLES: Role[] = [
  'Administrator',
  'Pastor',
  'Finance Officer',
  'Ministry Leader',
  'Church Member',
];

export default function LoginPage() {
  const router = useRouter();
  const { login, currentUser, isLoading } = useChurch();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('Administrator');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && currentUser) router.replace('/dashboard');
  }, [currentUser, isLoading, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password.');
      return;
    }
    setSubmitting(true);
    const result = login(username.trim(), password, role);
    if (result.success) {
      toast.success('Welcome back!', { description: `Signed in as ${role}` });
      router.replace('/dashboard');
    } else {
      setError(result.error ?? 'Login failed.');
      setSubmitting(false);
    }
  };

  const fillDemo = (r: Role) => {
    setRole(r);
    const map: Record<Role, string> = {
      Administrator: 'admin',
      Pastor: 'pastor',
      'Finance Officer': 'finance',
      'Ministry Leader': 'choirleader',
      'Church Member': 'member',
    };
    setUsername(map[r]);
    setPassword('password');
    setError(null);
  };

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      {/* Left: brand panel */}
      <section className="hidden lg:flex relative bg-sidebar text-sidebar-foreground p-12 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-accent blur-3xl" />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-accent/40 blur-3xl" />
        </div>
        <div className="relative flex items-center gap-3">
          <div className="size-12 rounded-xl bg-accent text-accent-foreground grid place-items-center shadow-lg">
            <Church className="size-6" />
          </div>
          <div>
            <p className="text-sm uppercase tracking-widest text-accent">
              IUAFC
            </p>
            <p className="font-semibold">Church Management System</p>
          </div>
        </div>

        <div className="relative space-y-6">
          <h1 className="text-4xl font-semibold leading-tight text-balance">
            The International United Apostolic Faith Church
          </h1>
          <p className="text-sidebar-foreground/80 leading-relaxed max-w-md text-pretty">
            One unified platform to manage members, ministries, events,
            attendance, donations, and announcements. all in one place.
          </p>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            {[
              'Member Records',
              'Attendance Tracking',
              'Donation Receipts',
              'Event Scheduling',
              'Ministry Oversight',
              'PDF Reports',
            ].map((f) => (
              <div
                key={f}
                className="rounded-lg border border-sidebar-border/60 bg-sidebar-accent/40 px-3 py-2 text-sm"
              >
                {f}
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-sidebar-foreground/60">
          &copy; {new Date().getFullYear()} The International United Apostolic
          Faith Church
        </p>
      </section>

      {/* Right: login form */}
      <section className="flex items-center justify-center p-2 bg-background">
        <div className="w-full max-w-md space-y-6">
          <header className="space-y-2 text-center lg:text-left">
            <div className="lg:hidden inline-flex">
              <img
                src="/logo.png"
                alt="IUAFC Logo"
                className="mx-auto lg:mx-0 w-30"
              />
            </div>
            <h2 className="text-2xl font-semibold">Sign in to your account</h2>
            <p className="text-sm text-muted-foreground">
              Use your church credentials to access the system.
            </p>
          </header>

          <Card className="border-border/70 shadow-sm">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={role}
                    onValueChange={(v) => setRole(v as Role)}
                  >
                    <SelectTrigger id="role" className="w-full">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="username"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-9"
                      placeholder="e.g. admin"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9"
                      placeholder="Enter password"
                    />
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Signing in…
                    </>
                  ) : (
                    'Sign in'
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-border space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Demo accounts (password:{' '}
                  <span className="font-mono">password</span>)
                </p>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => fillDemo(r)}
                      className="text-xs rounded-md border border-border bg-secondary hover:bg-accent hover:text-accent-foreground transition px-3 py-2 text-left"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
