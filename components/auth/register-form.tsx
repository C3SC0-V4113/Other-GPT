'use client';

import { projectAuthRegisterRequestSchema } from '@cesco_valle/identity-contracts/user';
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

import type { ProjectAuthRegisterRequest } from '@cesco_valle/identity-contracts/user';

type RegisterFormProps = {
  email: string;
};

export function RegisterForm({ email }: RegisterFormProps) {
  const t = useTranslations('auth');
  const { replace, refresh } = useRouter();
  const [serverError, setServerError] = useState<AuthErrorKey | null>(null);

  const form = useForm<ProjectAuthRegisterRequest>({
    resolver: zodResolver(projectAuthRegisterRequestSchema),
    // displayName is optional: keep it `undefined` (not '') so the optional schema
    // passes when left blank.
    defaultValues: { email, password: '', displayName: undefined },
  });

  const onSubmit = async (values: ProjectAuthRegisterRequest) => {
    setServerError(null);
    try {
      const response = await postJson('/api/auth/register', values);
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
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('displayNameLabel')}</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  autoComplete="name"
                  placeholder={t('displayNamePlaceholder')}
                  {...field}
                  value={field.value ?? ''}
                  onChange={(event) => {
                    // Empty input → undefined so the optional schema is satisfied.
                    field.onChange(event.target.value === '' ? undefined : event.target.value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('passwordLabel')}</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder={t('passwordPlaceholder')}
                  {...field}
                />
              </FormControl>
              <FormMessage>{t('errors.passwordTooShort')}</FormMessage>
            </FormItem>
          )}
        />
        {serverError ? (
          <p className="text-sm text-destructive" role="alert">
            {t(`errors.${serverError}`)}
          </p>
        ) : null}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? t('loading') : t('register')}
        </Button>
      </form>
    </Form>
  );
}
