'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Church, Loader2, Lock, Mail, MailCheck, User as UserIcon } from 'lucide-react';
import { useChurch } from '@/lib/church-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

type Mode = 'signin' | 'register' | 'forgot';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Where to go after signing in: the page in `?next=` (e.g. /delete-account) when it is a page
 * of this site, otherwise the dashboard.
 */
function nextPage(): string {
  const next = new URLSearchParams(window.location.search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
}

const TITLES: Record<Mode, { title: string; subtitle: string }> = {
  signin: {
    title: 'Sign in to your account',
    subtitle: 'Use your email or your Google account.',
  },
  register: {
    title: 'Create an account',
    subtitle: 'Register to access church events, announcements and more.',
  },
  forgot: {
    title: 'Forgot your password?',
    subtitle: 'Enter your email and we will send you a link to reset it.',
  },
};

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signUp, signInWithGoogle, sendPasswordReset, currentUser, isLoading } =
    useChurch();
  const [mode, setMode] = useState<Mode>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && currentUser) router.replace(nextPage());
  }, [currentUser, isLoading, router]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setSentTo(null);
    setPassword('');
    setConfirmPassword('');
  };

  const validate = (): string | null => {
    if (mode === 'register' && !fullName.trim()) return 'Full name is required.';
    if (!email.trim()) return 'Email is required.';
    if (!EMAIL_REGEX.test(email.trim())) return 'Enter a valid email address.';
    if (mode === 'forgot') return null;
    if (!password) return 'Password is required.';
    if (mode === 'register') {
      if (password.length < MIN_PASSWORD_LENGTH)
        return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
      if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
        return 'Password must contain letters and numbers.';
      if (password !== confirmPassword) return 'Passwords do not match.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const validationError = validate();
    setError(validationError);
    if (validationError) return;

    setSubmitting(true);
    if (mode === 'signin') {
      const result = await signIn(email, password);
      if (result.success) {
        toast.success('Welcome back!');
        router.replace(nextPage());
        return;
      }
      setError(result.error ?? 'Login failed.');
    } else if (mode === 'register') {
      const result = await signUp(fullName, email, password);
      if (!result.success) setError(result.error ?? 'Registration failed.');
      else if (result.needsConfirmation) setSentTo(email.trim());
      else {
        toast.success('Account created');
        router.replace(nextPage());
        return;
      }
    } else {
      const result = await sendPasswordReset(email);
      if (result.success) setSentTo(email.trim());
      else setError(result.error ?? 'Could not send the email.');
    }
    setSubmitting(false);
  };

  const handleGoogle = async () => {
    setError(null);
    setSubmitting(true);
    // On success the browser goes to Google and comes back to /dashboard.
    const result = await signInWithGoogle();
    if (!result.success) {
      setError(result.error ?? 'Google sign-in failed.');
      setSubmitting(false);
    }
  };

  const { title, subtitle } = TITLES[mode];

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
      <section className="flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md space-y-6">
          <header className="space-y-2 text-center lg:text-left">
            <div className="lg:hidden inline-flex">
              <img src="/logo.png" alt="IUAFC Logo" className="mx-auto lg:mx-0 w-30" />
            </div>
            <h2 className="text-2xl font-semibold">{sentTo ? 'Check your email' : title}</h2>
            <p className="text-sm text-muted-foreground">
              {sentTo
                ? mode === 'register'
                  ? `We sent a confirmation link to ${sentTo}. Open it to activate your account.`
                  : `If an account exists for ${sentTo}, you will receive a link to reset your password.`
                : subtitle}
            </p>
          </header>

          <Card className="border-border/70 shadow-sm">
            <CardContent className="p-6">
              {sentTo ? (
                <div className="space-y-4 text-center">
                  <MailCheck className="size-12 mx-auto text-primary" />
                  <Button variant="outline" className="w-full" onClick={() => switchMode('signin')}>
                    Back to sign in
                  </Button>
                </div>
              ) : (
                <>
                  <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    {mode === 'register' && (
                      <Field id="fullName" label="Full name" icon={UserIcon}>
                        <Input
                          id="fullName"
                          autoComplete="name"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="pl-9"
                          placeholder="e.g. Grace Adeyemi"
                        />
                      </Field>
                    )}

                    <Field id="email" label="Email" icon={Mail}>
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9"
                        placeholder="you@example.com"
                      />
                    </Field>

                    {mode !== 'forgot' && (
                      <Field id="password" label="Password" icon={Lock}>
                        <Input
                          id="password"
                          type="password"
                          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-9"
                          placeholder={
                            mode === 'register'
                              ? `At least ${MIN_PASSWORD_LENGTH} characters, letters and numbers`
                              : 'Enter password'
                          }
                        />
                      </Field>
                    )}

                    {mode === 'register' && (
                      <Field id="confirmPassword" label="Confirm password" icon={Lock}>
                        <Input
                          id="confirmPassword"
                          type="password"
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-9"
                          placeholder="Repeat password"
                        />
                      </Field>
                    )}

                    {mode === 'signin' && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => switchMode('forgot')}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}

                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" /> Please wait…
                        </>
                      ) : mode === 'signin' ? (
                        'Sign in'
                      ) : mode === 'register' ? (
                        'Register'
                      ) : (
                        'Send reset link'
                      )}
                    </Button>
                  </form>

                  {mode !== 'forgot' && (
                    <>
                      <div className="flex items-center gap-3 my-5">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-xs text-muted-foreground">or</span>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handleGoogle}
                        disabled={submitting}
                      >
                        <GoogleIcon /> Continue with Google
                      </Button>
                    </>
                  )}

                  <p className="mt-6 text-center text-sm text-muted-foreground">
                    {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                    <button
                      type="button"
                      onClick={() => switchMode(mode === 'signin' ? 'register' : 'signin')}
                      className="font-medium text-primary hover:underline"
                    >
                      {mode === 'signin' ? 'Register' : 'Sign in'}
                    </button>
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <p className="text-center text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:underline">Privacy policy</Link>
            {' · '}
            <Link href="/delete-account" className="hover:underline">Delete account</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function Field({
  id,
  label,
  icon: Icon,
  children,
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        {children}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-4" aria-hidden="true">
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
    </svg>
  );
}
