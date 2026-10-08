"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginAction, registerAction } from "@/lib/actions/auth";
import { type AuthFormInput, authFormSchema } from "@/lib/validators/auth";
import { applyFieldErrors, Field, fieldA11y } from "./field";
import { PasswordInput } from "./password-input";

type Mode = "login" | "register";

/** Only allow same-origin relative redirects after sign-in. */
function safeCallback(raw: string | null) {
  if (!raw) return "/";
  try {
    const url = new URL(raw, window.location.origin);
    if (
      url.origin !== window.location.origin ||
      url.pathname.startsWith("/login") ||
      url.pathname.startsWith("/register")
    )
      return "/";
    return url.pathname + url.search;
  } catch {
    return "/";
  }
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const isRegister = mode === "register";

  const form = useForm<AuthFormInput>({
    resolver: zodResolver(authFormSchema(mode)),
    defaultValues: { name: "", email: "", password: "" },
    mode: "onTouched",
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      let res;
      try {
        res = isRegister ? await registerAction(values) : await loginAction(values);
      } catch {
        setFormError("Something went wrong. Check your connection and try again.");
        return;
      }
      if (!res.ok) {
        setFormError(res.error);
        applyFieldErrors(res.fieldErrors, form.setError);
        return;
      }
      router.replace(safeCallback(params.get("callbackUrl")));
      router.refresh();
    });
  });

  const reason = params.get("reason");

  return (
    <div className="bg-card/80 rounded-3xl border p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-7">
      <h1 className="text-2xl font-bold tracking-tight">
        {isRegister ? "Create your account" : "Welcome back"}
      </h1>
      <p className="text-muted-foreground mt-1.5 text-sm">
        {isRegister
          ? "Start tracking every rupee in under a minute."
          : "Sign in to see where your money goes."}
      </p>

      {reason === "password-changed" && !formError ? (
        <p className="bg-primary/10 text-income mt-4 rounded-xl px-3.5 py-2.5 text-sm">
          Password changed. Please sign in again.
        </p>
      ) : null}
      {formError ? (
        <p
          role="alert"
          className="bg-expense/10 text-expense mt-4 rounded-xl px-3.5 py-2.5 text-sm"
        >
          {formError}
        </p>
      ) : null}

      <form onSubmit={onSubmit} noValidate className="mt-6 grid grid-cols-1 gap-4">
        {isRegister ? (
          <Field id="name" label="Name" error={errors.name?.message}>
            <Input
              {...fieldA11y("name", errors.name?.message)}
              autoComplete="name"
              placeholder="Your name"
              {...form.register("name")}
            />
          </Field>
        ) : null}
        <Field id="email" label="Email" error={errors.email?.message}>
          <Input
            {...fieldA11y("email", errors.email?.message)}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            placeholder="you@example.com"
            {...form.register("email")}
          />
        </Field>
        <Field
          id="password"
          label="Password"
          error={errors.password?.message}
          hint={isRegister ? "At least 8 characters." : undefined}
        >
          <PasswordInput
            {...fieldA11y("password", errors.password?.message)}
            autoComplete={isRegister ? "new-password" : "current-password"}
            placeholder="••••••••"
            {...form.register("password")}
          />
        </Field>
        <Button type="submit" size="lg" className="mt-2 w-full" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {isRegister ? "Create account" : "Sign in"}
        </Button>
      </form>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        {isRegister ? "Already have an account? " : "New to Wealth? "}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="text-primary font-semibold underline-offset-4 hover:underline"
        >
          {isRegister ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
