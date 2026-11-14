// Shared shape returned by form Server Actions
export type FormState = {
  error?: string;
  ok?: boolean;
  fieldErrors?: Record<string, string[] | undefined>;
  // Submitted values, so the form can refill itself after a validation error
  values?: Record<string, string>;
};
