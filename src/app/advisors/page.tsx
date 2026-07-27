import { RolePage, type RolePageSearchParams } from "@/components/role-page";

export const dynamic = "force-dynamic";

export default function AdvisorsPage({
  searchParams,
}: {
  searchParams: RolePageSearchParams;
}) {
  return <RolePage role="ADVISOR" searchParams={searchParams} />;
}
