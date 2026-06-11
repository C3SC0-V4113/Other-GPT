'use client';

import { registerEmailCheckRequestSchema } from '@cesco_valle/identity-contracts/user';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle } from 'lucide-react';
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

import type { RegisterEmailCheckRequest } from '@cesco_valle/identity-contracts/user';

type EmailFormProps = {
  defaultEmail: string;
  onResolved: (email: string, nextStep: 'LOGIN' | 'REGISTER') => void;
};

export function EmailForm({ defaultEmail, onResolved }: EmailFormProps) {
  const t = useTranslations('auth');
  const [serverError, setServerError] = useState<AuthErrorKey | null>(null);

  const form = useForm<RegisterEmailCheckRequest>({
    resolver: zodResolver(registerEmailCheckRequestSchema),
    defaultValues: { email: defaultEmail },
  });

  const onSubmit = async (values: RegisterEmailCheckRequest) => {
    setServerError(null);
    try {
      const response = await postJson('/api/auth/email-check', values);
      if (!response.ok) {
        setServerError(await readServerErrorKey(response));
        return;
      }
      const data = (await response.json()) as { nextStep: 'LOGIN' | 'REGISTER' };
      onResolved(values.email, data.nextStep);
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('emailLabel')}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder={t('emailPlaceholder')}
                  {...field}
                />
              </FormControl>
              <FormMessage>{t('errors.emailInvalid')}</FormMessage>
            </FormItem>
          )}
        />
        {serverError ? (
          <p className="text-sm text-destructive" role="alert">
            {t(`errors.${serverError}`)}
          </p>
        ) : null}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
            <LoaderCircle
              data-icon="inline-start"
              className="animate-spin motion-reduce:animate-none"
            />
          ) : null}
          {t('continue')}
        </Button>
      </form>
    </Form>
  );
}
