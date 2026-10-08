import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/forms/auth-form";
import { InstallAppButton } from "@/components/forms/install-app-button";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
      <InstallAppButton />
    </>
  );
}
