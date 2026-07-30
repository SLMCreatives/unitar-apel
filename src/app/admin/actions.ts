"use server";

import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SECTION_KEYS } from "@/lib/permissions";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const STATUSES = ["pending", "active", "disabled"] as const;
type Status = (typeof STATUSES)[number];

// Counts remaining active superadmins other than `exceptId`. Used to stop the
// last administrator from being disabled or demoted, which would lock everyone
// out of user management.
async function otherActiveSuperadmins(
  supabase: Supabase,
  exceptId: string
): Promise<number> {
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("is_superadmin", true)
    .eq("status", "active")
    .neq("id", exceptId);
  return count ?? 0;
}

// Applies status / role / superadmin changes to one profile. Superadmin-only.
export async function updateUser(userId: string, formData: FormData) {
  await requireSuperadmin();

  const supabase = await createClient();
  const { data: target, error: loadErr } = await supabase
    .from("profiles")
    .select("id, is_superadmin, status")
    .eq("id", userId)
    .maybeSingle<{ id: string; is_superadmin: boolean; status: Status }>();
  if (loadErr) throw new Error(loadErr.message);
  if (!target) throw new Error("User not found.");

  const statusRaw = String(formData.get("status") ?? "");
  const status = (STATUSES as readonly string[]).includes(statusRaw)
    ? (statusRaw as Status)
    : target.status;

  const roleRaw = String(formData.get("role_id") ?? "");
  const roleId = roleRaw === "" ? null : Number(roleRaw);
  if (roleId !== null && !Number.isInteger(roleId)) {
    throw new Error("Invalid role.");
  }

  const isSuperadmin = formData.get("is_superadmin") === "on";

  // Guard against removing the last active superadmin (covers self-lockout).
  const wasActiveSuperadmin = target.is_superadmin && target.status === "active";
  const willBeActiveSuperadmin = isSuperadmin && status === "active";
  if (wasActiveSuperadmin && !willBeActiveSuperadmin) {
    const others = await otherActiveSuperadmins(supabase, userId);
    if (others === 0) {
      throw new Error(
        "You can't disable or demote the last active superadmin — assign another one first."
      );
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ status, role_id: roleId, is_superadmin: isSuperadmin })
    .eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/users");
}

// --- Access roles -----------------------------------------------------------

function sectionsFromForm(formData: FormData): string[] {
  return formData
    .getAll("sections")
    .map(String)
    .filter((s) => (SECTION_KEYS as string[]).includes(s));
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function createRole(formData: FormData) {
  await requireSuperadmin();

  const label = String(formData.get("label") ?? "").trim();
  if (!label) throw new Error("Role name is required.");
  const key = slugify(String(formData.get("key") ?? "") || label);
  if (!key) throw new Error("Could not derive a key for this role.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("app_roles")
    .insert({ key, label, sections: sectionsFromForm(formData) });
  if (error) {
    throw new Error(
      error.code === "23505"
        ? `A role with the key "${key}" already exists.`
        : error.message
    );
  }

  revalidatePath("/admin/roles");
}

export async function updateRole(roleId: number, formData: FormData) {
  await requireSuperadmin();

  const label = String(formData.get("label") ?? "").trim();
  if (!label) throw new Error("Role name is required.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("app_roles")
    .update({ label, sections: sectionsFromForm(formData) })
    .eq("id", roleId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/roles");
  revalidatePath("/admin/users");
}

export async function deleteRole(roleId: number) {
  await requireSuperadmin();

  // Users holding this role keep their account; role_id is set null by the FK
  // (ON DELETE SET NULL), so they simply lose section access until reassigned.
  const supabase = await createClient();
  const { error } = await supabase.from("app_roles").delete().eq("id", roleId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/roles");
  revalidatePath("/admin/users");
}
