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

// Nothing saves on its own — the form is written only when a Save button is
// clicked. The Save bar sits above the page's two-column grid while the fields
// live inside the left column, so the two cannot be siblings in one component;
// they share save state through this context instead.

const FORM_ID = "learner-form";

type EditorContext = {
  state: LearnerSaveState;
  pending: boolean;
  dirty: boolean;
  formProps: {
    id: string;
    action: (formData: FormData) => void;
    onInput: React.FormEventHandler;
    onChange: React.FormEventHandler;
    onSubmit: React.FormEventHandler;
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

function formatTime(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SaveStatus() {
  const { state, pending, dirty } = useEditor();

  let text: string;
  let tone = "text-gray-500";

  if (pending) {
    text = "Saving…";
  } else if (state.status === "error") {
    text = state.message ?? "Could not save";
    tone = "text-red-700";
  } else if (dirty) {
    text = "Unsaved changes";
    tone = "text-amber-700";
  } else if (state.savedAt) {
    text = `Saved ${formatTime(state.savedAt)}`;
    tone = "text-green-700";
  } else {
    // Nothing edited yet — no status worth taking up space.
    return null;
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

// Holds the save state for the bar and the form. Wrap both in this.
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
  const [dirty, setDirty] = useState(false);
  // Counts edits so a save that lands can tell whether anything has been
  // typed since it was submitted — clearing "Unsaved changes" then would
  // claim newer edits are stored when they are not.
  const editSeq = useRef(0);
  const submittedSeq = useRef(-1);

  const onEdit = useCallback(() => {
    editSeq.current += 1;
    setDirty(true);
  }, []);

  const onSubmit = useCallback(() => {
    submittedSeq.current = editSeq.current;
  }, []);

  useEffect(() => {
    if (
      !pending &&
      state.status === "saved" &&
      editSeq.current === submittedSeq.current
    ) {
      setDirty(false);
    }
  }, [pending, state]);

  // Without autosave this is the only thing standing between an unsaved edit
  // and navigating away from it.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return (
    <Ctx.Provider
      value={{
        state,
        pending,
        dirty,
        formProps: {
          id: FORM_ID,
          action: formAction,
          onInput: onEdit,
          // Date and select controls fire change but not always input.
          onChange: onEdit,
          onSubmit,
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

// The learner fields. Submits only when a Save button is pressed.
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
