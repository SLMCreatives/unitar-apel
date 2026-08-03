// Result of a learner save, reported back to the editor so autosave can show
// progress instead of throwing into the error boundary. Lives here rather than
// in the actions file so the client editor can import the type on its own.

export type LearnerSaveState = {
  status: "idle" | "saved" | "error";
  message: string | null;
  // Epoch ms of the last successful save; kept across a later failure so the
  // "last saved" time stays on screen.
  savedAt: number | null;
};

export const INITIAL_SAVE_STATE: LearnerSaveState = {
  status: "idle",
  message: null,
  savedAt: null,
};
