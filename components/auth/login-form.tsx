'use client';

import { projectAuthLoginRequestSchema } from '@cesco_valle/identity-contracts/user';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import { postJson, readServerErrorKey, type AuthErrorKey } from './auth-client';

import type { ProjectAuthLoginRequest } from '@cesco_valle/identity-contracts/user';

type LoginFormProps = {
  email: string;
};

export function LoginForm({ email }: LoginFormProps) {
  const t = useTranslations('auth');
  const { replace, refresh } = useRouter();
  const [serverError, setServerError] = useState<AuthErrorKey | null>(null);

  const form = useForm<ProjectAuthLoginRequest>({
    resolver: zodResolver(projectAuthLoginRequestSchema),
    defaultValues: { email, password: '' },
  });

  const onSubmit = async (values: ProjectAuthLoginRequest) => {
    setServerError(null);
    try {
      const response = await postJson('/api/auth/login', values);
      if (!response.ok) {
        setServerError(await readServerErrorKey(response));
        return;
      }
      replace('/');
      refresh();
    } catch {
      setServerError('unreachable');
    }
  };

  return (
    <Form {...form}>
      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(event) => {
          void form.handleSubmit(onSubmit)(event);
        }}
      >
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('passwordLabel')}</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
                  placeholder={t('passwordPlaceholder')}
                  {...field}
                />
              </FormControl>
              <FormMessage>{t('errors.passwordRequired')}</FormMessage>
            </FormItem>
          )}
        />
        {serverError ? (
          <p className="text-sm text-destructive" role="alert">
            {t(`errors.${serverError}`)}
          </p>
        ) : null}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? t('loading') : t('login')}
        </Button>
      </form>
    </Form>
  );
}
