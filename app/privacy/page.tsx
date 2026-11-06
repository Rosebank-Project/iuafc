import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy – IUAFC Church Management',
  description: 'How the IUAFC Church Management app and website collect, use and protect personal information.',
};

const UPDATED = '6 November 2026';

/**
 * Privacy policy for the Android app and the website. Google Play requires a public privacy
 * policy URL for apps that handle personal information. Written with the Protection of Personal
 * Information Act (POPIA) of South Africa in mind.
 */
export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <article className="mx-auto max-w-3xl space-y-8 text-sm leading-relaxed">
        <header className="space-y-3 text-center">
          <img src="/logo.png" alt="IUAFC Logo" className="mx-auto w-20" />
          <h1 className="text-3xl font-semibold">Privacy Policy</h1>
          <p className="text-muted-foreground">
            IUAFC Church Management app and website · Last updated {UPDATED}
          </p>
        </header>

        <Section title="Who we are">
          <p>
            The IUAFC Church Management System is used by The International United Apostolic Faith
            Church (IUAFC) to manage its members, ministries, events, attendance, donations and
            announcements. It consists of an Android app and this website, which share one
            database. The church is responsible for the personal information in the system.
          </p>
        </Section>

        <Section title="What information we collect">
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Your account:</strong> your full name, email address and password. Passwords
              are never stored in readable form; the sign-in service keeps only a secure hash.
              If you use <em>Continue with Google</em>, we receive your name and email address from
              Google.
            </li>
            <li>
              <strong>Your role</strong> in the church (for example Church Member or Ministry
              Leader), set by an Administrator.
            </li>
            <li>
              <strong>Church records</strong> entered by the church office: member details (name,
              gender, date of birth, phone number, email, address, ministry and join date),
              attendance at events, donations (amount, type, payment method, date and receipt
              number), event registrations, and announcements and ministry activities.
            </li>
            <li>
              <strong>Settings on your phone:</strong> theme, notification preference and the phone
              number and address you add to your profile in the app are saved on your device only.
            </li>
            <li>
              <strong>Technical information:</strong> our hosting and database providers keep
              short-lived service logs (such as IP address and the time of a request) to run and
              secure the service. The website counts page visits anonymously, without cookies.
            </li>
          </ul>
          <p>We do not use your information for advertising and we do not sell it.</p>
        </Section>

        <Section title="How we use it">
          <ul className="list-disc pl-5 space-y-1">
            <li>To let you sign in and show you the screens of your role.</li>
            <li>To keep the church&apos;s member, attendance and giving records, and issue receipts.</li>
            <li>To share events, announcements and ministry activities with the congregation.</li>
            <li>To produce reports for the church leadership.</li>
          </ul>
        </Section>

        <Section title="Who can see it">
          <p>
            Access depends on your role and is enforced by the database itself (Row Level
            Security), not only by the app. For example, a Church Member can only see their own
            donations and attendance; only the Finance Officer, Pastor and Administrators can see
            all donations; and only Administrators can change roles.
          </p>
          <p>We use these service providers to run the system:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Supabase</strong> – database and sign-in service.</li>
            <li><strong>Google</strong> – only when you choose to sign in with Google.</li>
            <li><strong>Vercel</strong> – hosting of this website and anonymous visit counts.</li>
          </ul>
          <p>Information may be stored on servers outside South Africa by these providers.</p>
        </Section>

        <Section title="How we protect it">
          <p>
            All traffic is encrypted with HTTPS, passwords are hashed, access is limited by role in
            the database, and the keys that give full access to the database are never included in
            the app or the website.
          </p>
        </Section>

        <Section title="How long we keep it and how to delete your account">
          <p>
            Your account is kept until you delete it. You can delete it at any time in the app
            (<strong>Menu → Settings → Delete account</strong>) or on the{' '}
            <Link href="/delete-account" className="text-primary underline">delete account page</Link>.
            This removes your sign-in account and profile. Church records such as your member
            record, donations and attendance are kept for the church&apos;s history and financial
            records; you can ask the church office to remove your member record.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            Under the Protection of Personal Information Act (POPIA) you may ask to see the personal
            information the church holds about you, ask for it to be corrected or deleted, and
            object to its use. You can update your name in the app&apos;s Settings, and ask the
            church office for anything else.
          </p>
        </Section>

        <Section title="Children">
          <p>
            Accounts are intended for adults. Records of children (for example Sunday School
            members) are entered and managed by the church office with their parents&apos; consent.
          </p>
        </Section>

        <Section title="Changes and contact">
          <p>
            If this policy changes, the new version will be published on this page with a new date.
            For questions about your information, contact the IUAFC church office.
          </p>
        </Section>

        <footer className="border-t pt-6 text-center text-xs text-muted-foreground">
          <Link href="/" className="hover:underline">Back to sign in</Link>
          {' · '}
          <Link href="/delete-account" className="hover:underline">Delete account</Link>
        </footer>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
