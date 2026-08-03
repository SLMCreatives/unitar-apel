import Link from "next/link";
import { BulkUpload } from "@/components/bulk-upload";
import { SetupNotice, envReady } from "@/components/setup-notice";
import { requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function BulkUploadPage() {
  if (!envReady()) return <SetupNotice />;
  await requirePermission("learners");

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Back to learners
        </Link>
        <h1 className="mt-1 text-xl font-bold text-gray-900">
          Bulk upload learners
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Import learners and their details from a spreadsheet. You get a
          preview of every row before anything is saved.
        </p>
      </div>
      <BulkUpload />
    </div>
  );
}
