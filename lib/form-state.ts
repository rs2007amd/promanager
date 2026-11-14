// Shared shape returned by form Server Actions
export type FormState = {
  error?: string;
  ok?: boolean;
  // A one-time notice, for example a temporary password to hand to a tenant
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  // Submitted values, so the form can refill itself after a validation error
  values?: Record<string, string>;
};
