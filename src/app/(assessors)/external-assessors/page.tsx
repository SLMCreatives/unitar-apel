import { RolePage, type RolePageSearchParams } from "@/components/role-page";

export const dynamic = "force-dynamic";

export default function ExternalAssessorsPage({
  searchParams,
}: {
  searchParams: RolePageSearchParams;
}) {
  return <RolePage role="EXTERNAL_ASSESSOR" searchParams={searchParams} />;
}
