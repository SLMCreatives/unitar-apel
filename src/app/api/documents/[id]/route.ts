import { createClient } from "@/lib/supabase/server";
import { DOCUMENTS_BUCKET } from "@/lib/documents";

export const dynamic = "force-dynamic";

// Downloads go through a short-lived signed URL — files in the private
// bucket are never exposed via public paths.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const docId = Number(id);
  if (!Number.isInteger(docId)) {
    return new Response("Not found", { status: 404 });
  }

  const supabase = await createClient();
  const { data: doc, error } = await supabase
    .from("apel_documents")
    .select("storage_path, original_file_name")
    .eq("id", docId)
    .maybeSingle();
  if (error) return new Response(error.message, { status: 500 });
  if (!doc) return new Response("Not found", { status: 404 });

  const signed = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(doc.storage_path, 60, {
      download: doc.original_file_name,
    });
  if (signed.error || !signed.data) {
    return new Response(
      signed.error?.message ?? "Could not create a download link",
      { status: 500 }
    );
  }

  return Response.redirect(signed.data.signedUrl, 307);
}
