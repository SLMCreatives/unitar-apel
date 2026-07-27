import { RolePage, type RolePageSearchParams } from "@/components/role-page";

export const dynamic = "force-dynamic";

export default function InternalAssessorsPage({
  searchParams,
}: {
  searchParams: RolePageSearchParams;
}) {
  return <RolePage role="INTERNAL_ASSESSOR" searchParams={searchParams} />;
}
