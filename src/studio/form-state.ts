/** Shared shape for Studio form results. Kept out of "use server" files, which may export only async functions. */
export interface FormState {
  status: "idle" | "ok" | "error";
  message?: string;
  errors?: Record<string, string>;
  /** Set after a successful save: whether the public page differs from the draft. */
  unpublishedChanges?: boolean;
  savedAt?: number;
  /**
   * A single generated value the user must copy, such as the password hash on the activation page.
   * Only ever set for values that are safe to show once to the person who asked for them.
   */
  result?: { label: string; value: string; note?: string };
}

export const initialFormState: FormState = { status: "idle" };
