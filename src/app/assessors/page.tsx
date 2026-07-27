import { redirect } from "next/navigation";

// /internal-assessors, /external-assessors and /moderators are three role
// pages sharing one tabbed shell (see app/(assessors)/layout.tsx) — this
// legacy route just picks the default tab.
export default function AssessorsPage() {
  redirect("/internal-assessors");
}
