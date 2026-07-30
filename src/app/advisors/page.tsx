import { RolePage, type RolePageSearchParams } from "@/components/role-page";
import { requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdvisorsPage({
  searchParams,
}: {
  searchParams: RolePageSearchParams;
}) {
  await requirePermission("advisors");
  return <RolePage role="ADVISOR" searchParams={searchParams} />;
}
