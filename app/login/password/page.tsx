import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { LoginForm } from '@/components/auth/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');

  return {
    title: t('metaPasswordTitle'),
    description: t('metaPasswordDescription'),
  };
}

export default async function LoginPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }

  if (user) {
    redirect('/');
  }

  const [{ email }, t] = await Promise.all([searchParams, getTranslations('auth')]);

  if (!email) {
    redirect('/login');
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t('welcomeBackTitle')}</CardTitle>
        <CardDescription>{t('welcomeBackSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{email}</span>
          <Link
            href={`/login?email=${encodeURIComponent(email)}`}
            className="text-muted-foreground underline-offset-4 hover:underline"
          >
            {t('useAnotherEmail')}
          </Link>
        </div>
        <LoginForm email={email} />
      </CardContent>
    </Card>
  );
}
