"use client";

import {
  createContext,
  useActionState,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { INITIAL_SAVE_STATE, type LearnerSaveState } from "@/lib/learner-save";

// The Save bar sits above the page's two-column grid while the fields live
// inside the left column, so the two cannot be siblings in one component.
// They share the save state through this context instead.

const FORM_ID = "learner-form";

type EditorContext = {
  state: LearnerSaveState;
  pending: boolean;
  dirty: boolean;
  blocked: boolean;
  formProps: {
    id: string;
    ref: React.RefObject<HTMLFormElement | null>;
    action: (formData: FormData) => void;
    onInput: React.FormEventHandler;
    onChange: React.FormEventHandler;
  };
};

const Ctx = createContext<EditorContext | null>(null);

function useEditor(): EditorContext {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("Learner editor components must be inside LearnerEditor.");
  }
  return ctx;
}

// Typing settles before a save fires; picking a value from a select or date
// picker is a finished decision, so that saves almost immediately.
const TYPING_DELAY_MS = 1200;
const CHOICE_DELAY_MS = 250;

function delayFor(target: EventTarget | null): number {
  if (target instanceof HTMLSelectElement) return CHOICE_DELAY_MS;
  if (target instanceof HTMLInputElement) {
    const instant = ["date", "checkbox", "radio", "number"];
    if (instant.includes(target.type)) return CHOICE_DELAY_MS;
  }
  return TYPING_DELAY_MS;
}

function formatTime(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SaveStatus() {
  const { state, pending, dirty, blocked } = useEditor();

  let text: string;
  let tone = "text-gray-500";

  if (pending) {
    text = "Saving…";
  } else if (blocked) {
    text = "Not saved — some fields need fixing";
    tone = "text-amber-700";
  } else if (state.status === "error") {
    text = state.message ?? "Could not save";
    tone = "text-red-700";
  } else if (dirty) {
    text = "Unsaved changes…";
    tone = "text-amber-700";
  } else if (state.savedAt) {
    text = `Saved ${formatTime(state.savedAt)}`;
    tone = "text-green-700";
  } else {
    text = "Autosave on";
  }

  return (
    // aria-live so the outcome is announced rather than only shown.
    <p
      aria-live="polite"
      className={`max-w-xs truncate text-xs font-medium ${tone}`}
      title={text}
    >
      {text}
    </p>
  );
}

function SaveButton({ className }: { className: string }) {
  const { pending } = useEditor();
  return (
    <button type="submit" form={FORM_ID} disabled={pending} className={className}>
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}

// Owns the autosave timer and the save state. Wrap everything that needs
// either — both the bar and the form — in this.
export function LearnerEditor({
  action,
  children,
}: {
  action: (
    prev: LearnerSaveState,
    formData: FormData
  ) => Promise<LearnerSaveState>;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    INITIAL_SAVE_STATE
  );
  const formRef = useRef<HTMLFormElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dirty, setDirty] = useState(false);
  // True when autosave is held back because a field fails validation.
  const [blocked, setBlocked] = useState(false);

  const submit = useCallback(() => {
    // The timer has fired; clearing the ref is what lets the effect below
    // tell "saved and settled" from "saved but more typing is queued".
    timerRef.current = null;

    const form = formRef.current;
    if (!form) return;
    // Never autosave a form the browser would reject — the required-field
    // guard in the action throws, and the edit would be lost. Validation is
    // not reported here: yanking focus mid-typing is worse than waiting. The
    // Save buttons are real submits, so they show the native message.
    if (!form.checkValidity()) {
      setBlocked(true);
      return;
    }
    setBlocked(false);
    form.requestSubmit();
  }, []);

  const scheduleSave = useCallback(
    (delay: number) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(submit, delay);
    },
    [submit]
  );

  const onEdit = useCallback(
    (event: React.FormEvent) => {
      setDirty(true);
      setBlocked(false);
      scheduleSave(delayFor(event.target));
    },
    [scheduleSave]
  );

  // A save that lands clears the dirty flag — unless the user has since typed
  // again, in which case the pending timer will save that too.
  useEffect(() => {
    if (!pending && state.status === "saved" && !timerRef.current) {
      setDirty(false);
    }
  }, [pending, state]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  // Last line of defence: changes that never made it past validation would
  // otherwise disappear silently on navigation.
  useEffect(() => {
    if (!dirty && !blocked) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, blocked]);

  return (
    <Ctx.Provider
      value={{
        state,
        pending,
        dirty,
        blocked,
        formProps: {
          id: FORM_ID,
          ref: formRef,
          action: formAction,
          onInput: onEdit,
          // Date and select controls fire change but not always input.
          onChange: onEdit,
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

// Full-width action bar. Sticky, so saving stays one glance away however far
// down the page you scroll.
export function LearnerSaveBar({
  deleteSlot,
}: {
  // The delete form, rendered beside Save. Passed in rather than nested
  // because a <form> cannot contain another <form>.
  deleteSlot: React.ReactNode;
}) {
  return (
    <div className="sticky top-2 z-30 flex flex-wrap items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
      <SaveStatus />
      <SaveButton className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60" />
      {deleteSlot}
    </div>
  );
}

// The learner fields, in a form that saves itself shortly after any change.
export function LearnerEditForm({ children }: { children: React.ReactNode }) {
  const { formProps } = useEditor();

  return (
    <form {...formProps} className="space-y-6">
      {children}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <SaveStatus />
        <SaveButton className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60" />
      </div>
    </form>
  );
}
