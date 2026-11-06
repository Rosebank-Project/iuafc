'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Smartphone, Trash2 } from 'lucide-react';
import { useChurch } from '@/lib/church-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';

/**
 * Account deletion page. Google Play requires a web link where users of the app can delete
 * their account. It uses the same `delete_my_account` database function as the app's Settings.
 */
export default function DeleteAccountPage() {
  const router = useRouter();
  const { currentUser, isLoading, deleteAccount } = useChurch();
  const [confirmed, setConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!confirmed || deleting) return;
    setError(null);
    setDeleting(true);
    const result = await deleteAccount();
    if (result.success) {
      toast.success('Your account was deleted');
      router.replace('/');
    } else {
      setError(result.error ?? 'Could not delete your account. Please try again.');
      setDeleting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-lg space-y-6">
        <header className="space-y-2 text-center">
          <img src="/logo.png" alt="IUAFC Logo" className="mx-auto w-24" />
          <h1 className="text-2xl font-semibold">Delete your IUAFC account</h1>
          <p className="text-sm text-muted-foreground">
            For the IUAFC Church Management app and this website.
          </p>
        </header>

        <Card>
          <CardContent className="p-6 space-y-5 text-sm">
            <section className="space-y-2">
              <h2 className="font-semibold text-base">What is deleted</h2>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Your sign-in account (email and password, or your Google sign-in).</li>
                <li>Your profile: name, email and role.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="font-semibold text-base">What the church keeps</h2>
              <p className="text-muted-foreground">
                Church records stay for the church&apos;s history and finances: your member record,
                donations, attendance and event registrations, and the events, announcements and
                activities you created. They no longer show your account. To have your member
                record removed as well, ask the church office.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-semibold text-base flex items-center gap-2">
                <Smartphone className="size-4" /> In the app
              </h2>
              <p className="text-muted-foreground">
                Open <strong>Menu → Settings</strong> and tap <strong>Delete account</strong>.
              </p>
            </section>

            <section className="space-y-3 border-t pt-5">
              <h2 className="font-semibold text-base">On this website</h2>
              {isLoading ? (
                <div className="grid place-items-center py-4">
                  <Spinner className="size-5 text-primary" />
                </div>
              ) : !currentUser ? (
                <>
                  <p className="text-muted-foreground">Sign in first, then come back to this page.</p>
                  <Button asChild className="w-full">
                    <Link href="/?next=/delete-account">Sign in</Link>
                  </Button>
                </>
              ) : (
                <>
                  <p>
                    Signed in as <strong>{currentUser.fullName}</strong>
                    <span className="text-muted-foreground"> ({currentUser.username})</span>
                  </p>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="confirm"
                      checked={confirmed}
                      onCheckedChange={(v) => setConfirmed(v === true)}
                      disabled={deleting}
                    />
                    <Label htmlFor="confirm" className="leading-snug font-normal">
                      I understand that my account will be deleted permanently and this can&apos;t
                      be undone.
                    </Label>
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={!confirmed || deleting}
                    onClick={handleDelete}
                  >
                    {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                    Delete my account
                  </Button>
                </>
              )}
            </section>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          <Link href="/privacy" className="hover:underline">Privacy policy</Link>
          {' · '}
          <Link href="/" className="hover:underline">Back to sign in</Link>
        </p>
      </div>
    </main>
  );
}
