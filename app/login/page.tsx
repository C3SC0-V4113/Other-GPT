import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { AuthForm } from '@/components/auth/auth-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Authenticate to use otro-GPT.',
};

export default async function LoginPage() {
  // Resilient: only a confirmed valid session redirects into the chat. Any error
  // (e.g. identity-service unreachable) still renders the form so the user can act.
  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }

  if (user) {
    redirect('/');
  }

  const t = await getTranslations('auth');

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm />
        </CardContent>
      </Card>
    </main>
  );
}
