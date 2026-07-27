import { RolePage, type RolePageSearchParams } from "@/components/role-page";

export const dynamic = "force-dynamic";

export default function ModeratorsPage({
  searchParams,
}: {
  searchParams: RolePageSearchParams;
}) {
  return <RolePage role="MODERATOR" searchParams={searchParams} />;
}
