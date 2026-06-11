import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { EmailForm } from '@/components/auth/email-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

export default async function LoginPage({
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

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <EmailForm defaultEmail={email} />
      </CardContent>
    </Card>
  );
}
