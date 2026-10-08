import { z } from "zod";

// Avoid Zod's eval-based fast path: it would trip our CSP (no unsafe-eval).
z.config({ jitless: true });

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
  .max(254)
  .pipe(z.email("Enter a valid email address"));

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(128),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60, "Name is too long"),
  email: emailSchema,
  password: passwordSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required").max(128),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/** Client form schema: one shape for both modes so the form stays fully typed. */
export function authFormSchema(mode: "login" | "register") {
  const register = mode === "register";
  return z.object({
    name: register ? registerSchema.shape.name : z.string(),
    email: emailSchema,
    password: register ? passwordSchema : z.string().min(1, "Password is required").max(128),
  });
}
export type AuthFormInput = z.input<ReturnType<typeof authFormSchema>>;
