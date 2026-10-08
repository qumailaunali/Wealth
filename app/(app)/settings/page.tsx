import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import {
  DataSection,
  InstallSection,
  PasswordForm,
  PreferencesForm,
  ProfileForm,
  SessionSection,
} from "@/components/settings/settings-forms";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader title="Settings" backHref="/more" />
      <InstallSection />
      <ProfileForm />
      <PreferencesForm />
      <PasswordForm />
      <DataSection />
      <SessionSection />
      <p className="text-muted-foreground py-4 text-center text-xs">
        Wealth v1.0 · Made for personal use
      </p>
    </div>
  );
}
