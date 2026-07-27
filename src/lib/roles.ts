import type { AssessorRole, Learner, PersonnelRole } from "@/lib/types";

// Configuration for the four personnel roles. The role pages, assignment
// cards and forms all read from this instead of hardcoding per-role
// behaviour — hide or show role-specific fields here.
export type RoleConfig = {
  role: PersonnelRole;
  label: string;
  plural: string;
  route: string;
  // Moderators are not paid through this process, so claim/payment tracking
  // is disabled for them.
  claimEnabled: boolean;
  // Where the selection list lives: null → apel_advisors, otherwise
  // apel_assessors rows with this role.
  assessorRole: AssessorRole | null;
  // The legacy columns on public.apel that store the current person/date for
  // this role — kept in sync by the learner form.
  learnerNameColumn: keyof Learner & string;
  learnerDateColumn: keyof Learner & string;
};

export const ROLE_CONFIG: Record<PersonnelRole, RoleConfig> = {
  ADVISOR: {
    role: "ADVISOR",
    label: "Advisor",
    plural: "Advisors",
    route: "/advisors",
    claimEnabled: true,
    assessorRole: null,
    learnerNameColumn: "advisor",
    learnerDateColumn: "advisor_appointment_date",
  },
  INTERNAL_ASSESSOR: {
    role: "INTERNAL_ASSESSOR",
    label: "Internal Assessor",
    plural: "Internal Assessors",
    route: "/internal-assessors",
    claimEnabled: true,
    assessorRole: "INTERNAL",
    learnerNameColumn: "internal_assessor",
    learnerDateColumn: "internal_assessor_appointment_date",
  },
  EXTERNAL_ASSESSOR: {
    role: "EXTERNAL_ASSESSOR",
    label: "External Assessor",
    plural: "External Assessors",
    route: "/external-assessors",
    claimEnabled: true,
    assessorRole: "EXTERNAL",
    learnerNameColumn: "external_assessor",
    learnerDateColumn: "external_assessor_appointment_date",
  },
  MODERATOR: {
    role: "MODERATOR",
    label: "Moderator",
    plural: "Moderators",
    route: "/moderators",
    claimEnabled: false,
    assessorRole: "MODERATOR",
    learnerNameColumn: "moderator",
    learnerDateColumn: "moderator_appointment_date",
  },
};

export function roleConfigForAssessorRole(role: string | null) {
  return Object.values(ROLE_CONFIG).find((c) => c.assessorRole === role) ?? null;
}
