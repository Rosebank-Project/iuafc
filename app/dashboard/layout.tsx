'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, Church, CircleAlert } from 'lucide-react';
import { useChurch } from '@/lib/church-context';
import { AppSidebar, NAV_ITEMS } from '@/components/app-sidebar';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, isLoading, dataError, reloadData } = useChurch();
  const [retrying, setRetrying] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !currentUser) router.replace('/');
  }, [currentUser, isLoading, router]);

  // Role-based route protection
  useEffect(() => {
    if (!currentUser) return;
    const item = NAV_ITEMS.find(
      (i) =>
        pathname === i.href ||
        (i.href !== '/dashboard' && pathname.startsWith(i.href)),
    );
    if (item && !item.roles.includes(currentUser.role)) {
      router.replace('/dashboard');
    }
  }, [pathname, currentUser, router]);

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  const currentNav = NAV_ITEMS.find(
    (i) =>
      pathname === i.href ||
      (i.href !== '/dashboard' && pathname.startsWith(i.href)),
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-auto shrink-0 border-r border-sidebar-border">
        <AppSidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex items-center gap-3 h-16 px-4 sm:px-6 bg-card/80 backdrop-blur border-b border-border">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="size-5" />
                <span className="sr-only">Open navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="p-0 w-72 bg-sidebar border-sidebar-border"
            >
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <AppSidebar onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="lg:hidden flex items-center gap-2">
            <div className="size-8 rounded-md bg-primary text-primary-foreground grid place-items-center">
              <Church className="size-4" />
            </div>
            <span className="font-semibold text-sm">IUAFC</span>
          </div>

          <div className="hidden lg:block flex-1">
            <h1 className="text-lg font-semibold">
              {currentNav?.label ?? 'Dashboard'}
            </h1>
            <p className="text-xs text-muted-foreground">
              The International United Apostolic Faith Church
            </p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium leading-tight">
                {currentUser.fullName}
              </p>
              <p className="text-xs text-muted-foreground leading-tight">
                {currentUser.role}
              </p>
            </div>
            <div className="size-9 rounded-full bg-primary text-primary-foreground grid place-items-center text-sm font-semibold">
              {currentUser.fullName
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {dataError && (
            <Alert variant="destructive" className="mb-6">
              <CircleAlert />
              <AlertTitle>Could not load the church data</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center gap-3">
                <span>{dataError}</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={retrying}
                  onClick={async () => {
                    setRetrying(true);
                    await reloadData();
                    setRetrying(false);
                  }}
                >
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
