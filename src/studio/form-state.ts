/** Shared shape for Studio form results. Kept out of "use server" files, which may export only async functions. */
export interface FormState {
  status: "idle" | "ok" | "error";
  message?: string;
  errors?: Record<string, string>;
  /** Set after a successful save: whether the public page differs from the draft. */
  unpublishedChanges?: boolean;
  savedAt?: number;
}

export const initialFormState: FormState = { status: "idle" };
