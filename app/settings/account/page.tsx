import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';

import { RoleRequestCta } from '@/components/account/role-request-cta';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth';
import { isBasicUser } from '@/lib/roles';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('account');

  return { title: t('title'), description: t('subtitle') };
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm break-words">{value}</span>
    </div>
  );
}

export default async function AccountPage() {
  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }

  if (!user) {
    redirect('/login');
  }

  const [t, format] = await Promise.all([getTranslations('account'), getFormatter()]);

  const roleNames =
    user.membership?.roles.map((role) => `${role.name} (${role.code})`).join(', ') || '—';
  const statusLabel = user.user.status === 'BANNED' ? t('statusBanned') : t('statusActive');
  const memberSince = format.dateTime(new Date(user.user.createdAt), { dateStyle: 'long' });

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground lg:hidden"
      >
        <ChevronLeft className="size-4" />
        <span>{t('back')}</span>
      </Link>

      <div className="flex w-full flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field label={t('fields.email')} value={user.user.email} />
            <Field
              label={t('fields.displayName')}
              value={user.user.displayName ?? t('noDisplayName')}
            />
            <Field label={t('fields.status')} value={statusLabel} />
            <Field label={t('fields.memberSince')} value={memberSince} />
            <Field label={t('fields.project')} value={user.project.name} />
            <Field label={t('fields.role')} value={roleNames} />
          </CardContent>
        </Card>

        {isBasicUser(user) && <RoleRequestCta />}
      </div>
    </div>
  );
}
