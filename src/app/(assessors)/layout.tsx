import { AssessorTabs } from "@/components/assessor-tabs";

// Shared shell for the internal assessor, external assessor and moderator
// pages — same page, switched via tabs, instead of three separate nav
// entries. This is a route group (parenthesized folder): it contributes no
// URL segment, it only lets these three routes share this layout.
export default function AssessorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <AssessorTabs />
      {children}
    </div>
  );
}
