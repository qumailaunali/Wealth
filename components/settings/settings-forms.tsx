"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Download, Loader2, LogOut, Share, Smartphone, SquarePlus } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { applyFieldErrors, Field, fieldA11y } from "@/components/forms/field";
import { PasswordInput } from "@/components/forms/password-input";
import { usePrefs } from "@/components/providers/app-data";
import { usePwa } from "@/components/providers/pwa-provider";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Segmented } from "@/components/ui/segmented";
import { logoutAction } from "@/lib/actions/auth";
import {
  changePassword,
  deleteUserAccount,
  updatePreferences,
  updateProfile,
} from "@/lib/actions/settings";
import { CURRENCIES, LOCALES, TIMEZONES } from "@/lib/currencies";
import { type ChangePasswordInput, changePasswordSchema } from "@/lib/validators/auth";
import { type PreferencesInput, preferencesSchema, profileSchema } from "@/lib/validators/finance";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card rounded-3xl border p-4 sm:p-5" aria-label={title}>
      <h2 className="text-base font-semibold">{title}</h2>
      {description ? <p className="text-muted-foreground mt-0.5 text-sm">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ProfileForm() {
  const prefs = usePrefs();
  const [pending, startTransition] = useTransition();
  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: prefs.name, email: prefs.email },
  });
  const { errors, isDirty } = form.formState;
  return (
    <Section title="Profile">
      <form
        noValidate
        className="grid grid-cols-1 gap-4"
        onSubmit={form.handleSubmit((values) =>
          startTransition(async () => {
            const res = await updateProfile(values);
            if (!res.ok) {
              applyFieldErrors(res.fieldErrors, form.setError);
              return void toast.error(res.error);
            }
            form.reset(values);
            toast.success("Profile saved");
          }),
        )}
      >
        <Field id="p-name" label="Name" error={errors.name?.message}>
          <Input
            {...fieldA11y("p-name", errors.name?.message)}
            autoComplete="name"
            {...form.register("name")}
          />
        </Field>
        <Field id="p-email" label="Email" error={errors.email?.message}>
          <Input
            {...fieldA11y("p-email", errors.email?.message)}
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            {...form.register("email")}
          />
        </Field>
        <Button type="submit" disabled={pending || !isDirty} className="justify-self-start">
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null} Save profile
        </Button>
      </form>
    </Section>
  );
}

export function PreferencesForm() {
  const prefs = usePrefs();
  const [pending, startTransition] = useTransition();
  const form = useForm<PreferencesInput>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      defaultCurrency: prefs.defaultCurrency,
      locale: prefs.locale,
      weekStart: prefs.weekStart,
      timezone: prefs.timezone,
      theme: prefs.theme,
    },
  });
  const theme = useWatch({ control: form.control, name: "theme" });
  const timezones = TIMEZONES.includes(prefs.timezone as (typeof TIMEZONES)[number])
    ? TIMEZONES
    : [prefs.timezone, ...TIMEZONES];

  return (
    <Section title="Preferences" description="Currency, number format, calendar and appearance.">
      <form
        noValidate
        className="grid grid-cols-1 gap-4"
        onSubmit={form.handleSubmit((values) =>
          startTransition(async () => {
            const res = await updatePreferences(values);
            if (!res.ok) return void toast.error(res.error);
            document.documentElement.dataset.theme = values.theme;
            toast.success("Preferences saved");
          }),
        )}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="pref-currency"
            label="Default currency"
            hint="Used for totals, budgets and reports."
          >
            <NativeSelect id="pref-currency" {...form.register("defaultCurrency")}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} · {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="pref-locale" label="Number format">
            <NativeSelect id="pref-locale" {...form.register("locale")}>
              {LOCALES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="pref-week" label="First day of week">
            <NativeSelect id="pref-week" {...form.register("weekStart")}>
              <option value={1}>Monday</option>
              <option value={0}>Sunday</option>
              <option value={6}>Saturday</option>
            </NativeSelect>
          </Field>
          <Field id="pref-tz" label="Timezone">
            <NativeSelect id="pref-tz" {...form.register("timezone")}>
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <span className="text-muted-foreground text-sm font-medium">Theme</span>
          <Segmented
            label="Theme"
            value={theme}
            onChange={(t) => form.setValue("theme", t, { shouldDirty: true })}
            options={[
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" },
            ]}
          />
        </div>
        <Button type="submit" disabled={pending} className="justify-self-start">
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null} Save
          preferences
        </Button>
      </form>
    </Section>
  );
}

export function PasswordForm() {
  const [pending, startTransition] = useTransition();
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const { errors } = form.formState;
  return (
    <Section title="Change password" description="You'll be signed out on all devices.">
      <form
        noValidate
        className="grid grid-cols-1 gap-4"
        onSubmit={form.handleSubmit((values) =>
          startTransition(async () => {
            const res = await changePassword(values);
            if (res && !res.ok) {
              applyFieldErrors(res.fieldErrors, form.setError);
              toast.error(res.error);
            }
          }),
        )}
      >
        <Field id="pw-current" label="Current password" error={errors.currentPassword?.message}>
          <PasswordInput
            {...fieldA11y("pw-current", errors.currentPassword?.message)}
            autoComplete="current-password"
            {...form.register("currentPassword")}
          />
        </Field>
        <Field
          id="pw-new"
          label="New password"
          error={errors.newPassword?.message}
          hint="At least 8 characters."
        >
          <PasswordInput
            {...fieldA11y("pw-new", errors.newPassword?.message)}
            autoComplete="new-password"
            {...form.register("newPassword")}
          />
        </Field>
        <Field id="pw-confirm" label="Confirm new password" error={errors.confirmPassword?.message}>
          <PasswordInput
            {...fieldA11y("pw-confirm", errors.confirmPassword?.message)}
            autoComplete="new-password"
            {...form.register("confirmPassword")}
          />
        </Field>
        <Button type="submit" disabled={pending} className="justify-self-start">
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null} Update password
        </Button>
      </form>
    </Section>
  );
}

export function InstallSection() {
  const { canInstall, isStandalone, isIos, promptInstall } = usePwa();
  return (
    <Section
      title="Install app"
      description="Add Wealth to your home screen for a full-screen, app-like experience."
    >
      {isStandalone ? (
        <p className="text-income flex items-center gap-2 text-sm">
          <Smartphone className="size-4" aria-hidden="true" /> Wealth is installed on this device.
        </p>
      ) : canInstall ? (
        <Button
          onClick={async () => {
            if (await promptInstall()) toast.success("Installing Wealth…");
          }}
        >
          <Download aria-hidden="true" /> Install Wealth
        </Button>
      ) : isIos ? (
        <ol className="grid grid-cols-1 gap-3 text-sm">
          <li className="flex items-center gap-3">
            <span className="bg-surface-2 flex size-8 items-center justify-center rounded-lg">
              <Share className="size-4" aria-hidden="true" />
            </span>
            In Safari, tap the <strong>Share</strong> button.
          </li>
          <li className="flex items-center gap-3">
            <span className="bg-surface-2 flex size-8 items-center justify-center rounded-lg">
              <SquarePlus className="size-4" aria-hidden="true" />
            </span>
            Choose <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.
          </li>
        </ol>
      ) : (
        <p className="text-muted-foreground text-sm">
          Open this site in Chrome (Android) or Safari (iPhone) over HTTPS, then use the browser
          menu → “Install app” / “Add to Home Screen”.
        </p>
      )}
    </Section>
  );
}

export function DataSection() {
  return (
    <Section title="Your data" description="Download everything. Your data is yours.">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <a href="/api/export/csv" download>
            <Download aria-hidden="true" /> Transactions (CSV)
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href="/api/export/json" download>
            <Download aria-hidden="true" /> Full backup (JSON)
          </a>
        </Button>
      </div>
    </Section>
  );
}

export function SessionSection() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Section title="Account">
      <div className="flex flex-wrap gap-2">
        <form action={logoutAction}>
          <Button type="submit" variant="outline">
            <LogOut aria-hidden="true" /> Log out
          </Button>
        </form>
        <Button variant="outline" className="text-expense" onClick={() => setOpen(true)}>
          Delete account
        </Button>
      </div>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes your profile, accounts, categories and every transaction.
              This can&apos;t be undone. Consider exporting a backup first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-1 gap-3">
            <Field id="del-password" label="Password">
              <PasswordInput
                id="del-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </Field>
            <Field id="del-confirm" label='Type "DELETE" to confirm'>
              <Input
                id="del-confirm"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoCapitalize="characters"
              />
            </Field>
            {error ? (
              <p role="alert" className="text-expense text-sm">
                {error}
              </p>
            ) : null}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              className="bg-destructive hover:bg-destructive/90 text-white"
              disabled={pending || confirm !== "DELETE" || !password}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const res = await deleteUserAccount({ password, confirm });
                  if (res && !res.ok) setError(res.error);
                })
              }
            >
              {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null} Delete
              forever
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Section>
  );
}
