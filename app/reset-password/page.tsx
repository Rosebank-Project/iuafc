'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Lock } from 'lucide-react';
import { useChurch } from '@/lib/church-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';

const MIN_PASSWORD_LENGTH = 8;

/** Opened from the "reset password" email. Supabase signs the user in from the link. */
export default function ResetPasswordPage() {
  const router = useRouter();
  const { currentUser, isLoading, updatePassword } = useChurch();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (password.length < MIN_PASSWORD_LENGTH)
      return setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
      return setError('Password must contain letters and numbers.');
    if (password !== confirmPassword) return setError('Passwords do not match.');

    setError(null);
    setSubmitting(true);
    const result = await updatePassword(password);
    if (result.success) {
      toast.success('Password updated');
      router.replace('/dashboard');
    } else {
      setError(result.error ?? 'Could not update the password.');
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-6">
        <header className="space-y-2 text-center">
          <img src="/logo.png" alt="IUAFC Logo" className="mx-auto w-24" />
          <h1 className="text-2xl font-semibold">Choose a new password</h1>
        </header>
        <Card>
          <CardContent className="p-6">
            {!currentUser ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  This reset link is invalid or has expired. Request a new one from the sign-in page.
                </p>
                <Button className="w-full" onClick={() => router.replace('/')}>
                  Back to sign in
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {[
                  { id: 'password', label: 'New password', value: password, set: setPassword },
                  { id: 'confirmPassword', label: 'Confirm new password', value: confirmPassword, set: setConfirmPassword },
                ].map((f) => (
                  <div key={f.id} className="space-y-2">
                    <Label htmlFor={f.id}>{f.label}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id={f.id}
                        type="password"
                        autoComplete="new-password"
                        value={f.value}
                        onChange={(e) => f.set(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                ))}
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Saving…
                    </>
                  ) : (
                    'Update password'
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
