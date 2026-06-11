'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { EmailForm } from './email-form';
import { LoginForm } from './login-form';
import { RegisterForm } from './register-form';

type Step = 'email' | 'login' | 'register';

export function AuthForm() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<Step>('email');

  if (step === 'email') {
    return (
      <EmailForm
        defaultEmail={email}
        onResolved={(value, nextStep) => {
          setEmail(value);
          setStep(nextStep === 'LOGIN' ? 'login' : 'register');
        }}
      />
    );
  }

  const isRegister = step === 'register';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          {isRegister ? t('createAccountSubtitle') : t('welcomeBackSubtitle')}
        </p>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{email}</span>
          <button
            type="button"
            className="text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => {
              setStep('email');
            }}
          >
            {t('useAnotherEmail')}
          </button>
        </div>
      </div>
      {isRegister ? <RegisterForm email={email} /> : <LoginForm email={email} />}
    </div>
  );
}
