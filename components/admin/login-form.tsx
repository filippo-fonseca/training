'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { signIn, type LoginState } from '@/app/login/actions';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/admin/field';

const INITIAL: LoginState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full justify-center" disabled={pending}>
      {pending ? 'Signing in…' : 'Sign in'}
    </Button>
  );
}

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction] = useActionState(signIn, INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="redirectTo" value={redirectTo ?? '/admin'} />
      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          required
          placeholder="you@example.com"
        />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </Field>
      {state.error ? (
        <p
          role="alert"
          className="rounded-sd-chrome border px-3 py-2 text-xs"
          style={{
            color: 'var(--ink-coral)',
            background: 'color-mix(in srgb, var(--ink-coral) 12%, var(--sd-box))',
            borderColor: 'color-mix(in srgb, var(--ink-coral) 30%, var(--sd-line))',
          }}
        >
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
