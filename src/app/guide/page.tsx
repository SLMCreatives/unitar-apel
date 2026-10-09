import type { Metadata } from "next";
import Link from "next/link";
import {
  AppointmentLetterStatusBadge,
  ClaimStatusBadge,
  PaymentBadge,
  ResultBadge,
  StageBadge,
  StatusBadge,
} from "@/components/badges";
import { GuideToc, type TocItem } from "@/components/guide-toc";
import {
  Btn,
  Callout,
  Card,
  CheckItem,
  Entry,
  EventCard,
  GuideSection,
  Prose,
  Step,
  Steps,
  SubSection,
  ToConfirm,
  UI,
  Val,
  WindowMeter,
} from "@/components/guide-ui";
import { PAGE_SIZES } from "@/components/pagination";
import { requireActiveUser } from "@/lib/auth";
import { LEARNER_IMPORT_FIELDS, REQUIRED_IMPORT_FIELDS } from "@/lib/bulk-import";
import { MAX_IMPORT_ROWS, MAX_IMPORT_SIZE_MB } from "@/lib/bulk-parse";
import {
  ALLOWED_DOCUMENT_EXTENSIONS,
  DOCUMENT_CATEGORIES,
  MAX_DOCUMENT_SIZE_MB,
} from "@/lib/documents";
import { AGE_BUCKETS } from "@/lib/lead-ageing";
import { ROLE_CONFIG } from "@/lib/roles";
import {
  ADVISOR_PAYMENT_MODES,
  APPOINTMENT_LETTER_STATUSES,
  ASSESSMENT_STAGES,
  ASSIGNMENT_STAGES,
  CLAIM_STATUSES,
  LEARNER_STATUSES,
  PAYMENT_STATUSES,
  RESULT_STATUSES,
  SELF_ASSESSMENT_STATUSES,
  SPONSORS,
} from "@/lib/types";

// Read-only user guide for APEL Centre staff. Field names, button text and
// dropdown values are written exactly as the app shows them; lists of values
// and limits are imported from the same constants the app uses, so they can't
// drift. Uses no learner data — examples use the dummy "TEST LEARNER".

export const metadata: Metadata = {
  title: "Guide — UNITAR APEL.Q Tracker",
  description: "How to keep APEL Q learner records up to date in the tracker",
};

const TOC: TocItem[] = [
  { id: "start-here", label: "1. Start here" },
  {
    id: "journey",
    label: "2. The APEL Q journey",
    children: [
      { id: "early-screening", label: "Early screening" },
      { id: "modules", label: "The four modules" },
    ],
  },
  {
    id: "what-to-update",
    label: "3. What to update at each stage",
    children: [
      { id: "event-new-candidate", label: "New candidate registered" },
      { id: "event-fee-paid", label: "Registration fee paid" },
      { id: "event-advisor-assigned", label: "Advisor assigned" },
      { id: "event-self-assessment-done", label: "Self-Assessment done" },
      { id: "event-offer-letter", label: "Offer letter issued" },
      { id: "twelve-month-window", label: "How the 12-month window works" },
      { id: "event-module-start", label: "Learner starts a module" },
      { id: "event-module-result", label: "Module result is in" },
      { id: "event-assessor-appointed", label: "Assessor or moderator appointed" },
      { id: "event-completed", label: "All four modules passed" },
      { id: "event-withdraw", label: "Learner drops out" },
    ],
  },
  {
    id: "how-to",
    label: "4. How-to guides",
    children: [
      { id: "add-learner", label: "Add a learner" },
      { id: "bulk-upload", label: "Bulk upload" },
      { id: "find-learner", label: "Find a learner" },
      { id: "update-learner", label: "Update a learner’s progress" },
      { id: "assign-personnel", label: "Assign advisors, assessors, moderators" },
      { id: "add-personnel", label: "Add people to the lists" },
      { id: "documents", label: "Upload documents" },
      { id: "folder-links", label: "External Folder Links" },
      { id: "notes-follow-ups", label: "Notes and follow-ups" },
      { id: "dashboard", label: "Read the Dashboard" },
      { id: "reports", label: "Reports and Export to Excel" },
    ],
  },
  { id: "weekly-checklist", label: "5. Weekly checklist" },
  { id: "common-mistakes", label: "6. Common mistakes" },
  {
    id: "glossary",
    label: "7. Glossary",
    children: [
      { id: "glossary-terms", label: "Terms" },
      { id: "glossary-dropdowns", label: "Dropdowns and their values" },
    ],
  },
];

const JOURNEY = [
  { label: "Early screening", record: "No stage yet", circle: "bg-gray-200 text-gray-700" },
  { label: "Self-Assessment", record: "SELF ASSESSMENT", circle: "bg-slate-200 text-slate-800" },
  { label: "Offer letter", record: "Offer Letter Issued Date", circle: "bg-amber-100 text-amber-800" },
  { label: "Portfolio", record: "PORTFOLIO", circle: "bg-blue-100 text-blue-800" },
  { label: "FVV", record: "FVV", circle: "bg-violet-100 text-violet-800" },
  { label: "Challenge Test", record: "CHALLENGE TEST", circle: "bg-orange-100 text-orange-800" },
  { label: "Capstone", record: "CAPSTONE", circle: "bg-cyan-100 text-cyan-800" },
  { label: "Completed", record: "COMPLETED", circle: "bg-green-100 text-green-800" },
  { label: "Graduated", record: "GRADUATED", circle: "bg-emerald-100 text-emerald-800" },
];

const SHORT_BREAKDOWN = [
  "Preparation / Assessment 4 wks",
  "Moderation Present to Int. 2 wks",
  "Committee 1 wk",
];
const LONG_BREAKDOWN = [
  "Preparation / Assessment 8 wks",
  "BRS 1 1 wk",
  "Moderation Present to Int. 2 wks",
  "Committee 1 wk",
];

const MODULES = [
  {
    step: 1,
    name: "Portfolio",
    total: "7 weeks",
    breakdown: SHORT_BREAKDOWN,
    about:
      "A formal collection of evidence of formal, non-formal and informal learning (submission form, learning statements, documentary evidence). It shows the learning matches the programme.",
  },
  {
    step: 2,
    name: "Field Validation Visit (FVV)",
    total: "7 weeks",
    breakdown: SHORT_BREAKDOWN,
    about:
      "The learner demonstrates their learning at their workplace or another suitable location so assessors can validate their knowledge and competencies.",
  },
  {
    step: 3,
    name: "Challenge Test",
    total: "12 weeks",
    breakdown: LONG_BREAKDOWN,
    about:
      "A proctored standardised test. It can be written, oral, a product and/or a performance assessment.",
  },
  {
    step: 4,
    name: "Capstone Course",
    total: "12 weeks",
    breakdown: LONG_BREAKDOWN,
    about:
      "Covers the programme’s key learning outcomes and includes a comprehensive oral examination.",
  },
];

// How each module maps onto the learner form.
const MODULE_FIELDS = [
  { stage: "PORTFOLIO", date: "Portfolio Date", claim: null },
  { stage: "FVV", date: "FVV Date", claim: "Claim Submission 1 to APEL Centre (RM)" },
  { stage: "CHALLENGE TEST", date: "Challenge Test Date", claim: null },
  { stage: "CAPSTONE", date: "Capstone Date", claim: "Claim Submission 2 to APEL Centre (RM)" },
];

const INTERNAL = ROLE_CONFIG.INTERNAL_ASSESSOR;
const ORPHAN_NOTICE = `Has assignments but is not in the ${INTERNAL.plural.toLowerCase()} list — add them above to manage them normally.`;

const ALLOWED_FILES = ALLOWED_DOCUMENT_EXTENSIONS.map((e) => e.slice(1)).join(", ");

function Required() {
  return <span className="text-xs font-semibold text-red-600">Required</span>;
}

function vals(list: readonly string[]) {
  return list.map((v) => <Val key={v}>{v}</Val>);
}

// Values shown in brackets inside a sentence.
function InlineVals({ list }: { list: readonly string[] }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1 align-middle">
      ({vals(list)})
    </span>
  );
}

function Or() {
  return <span className="text-xs text-gray-400">or</span>;
}

export default async function GuidePage() {
  await requireActiveUser();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">User guide</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          What to update in the tracker, when, and how. Written for APEL Centre
          staff who create and update learner records.
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
        <aside className="sticky top-0 z-20 lg:static lg:z-auto">
          <GuideToc items={TOC} />
        </aside>

        <article className="min-w-0 max-w-4xl space-y-12 pt-4 lg:pt-0">
          {/* ------------------------------------------------------------ */}
          <GuideSection id="start-here" number={1} title="Start here">
            <Prose>
              <p>
                The APEL.Q Tracker is the APEL Centre’s record of every APEL Q
                learner, from registration on the MQA website to graduation.
                Each learner has one record. That record holds their details,
                payment, advisor and assessors, stage, results and key dates.
                The Dashboard, Reports and the Excel export are all built from
                these records.
              </p>
            </Prose>

            <Callout tone="info" title="The golden rule">
              <p>
                Whenever something happens to a learner, update their record
                the same day.
              </p>
              <p>
                The Dashboard, Reports, the 12-month window and Advisor Load are
                all calculated from the fields on the learner record. If a field
                is empty, that learner is missing from that view. Nobody else
                fills it in for you.
              </p>
            </Callout>

            <Prose>
              <p>
                Why this matters: when this guide was written, only 110 of 246
                learners had an <UI>Assessment Stage</UI>, and no learner had an{" "}
                <UI>Offer Letter Issued Date</UI>. That meant the Pipeline was
                missing more than half the learners, and the 12-month window
                couldn’t be tracked for anyone.
              </p>
              <p>
                Quick links:{" "}
                <a href="#what-to-update" className="text-blue-600 hover:underline">
                  what to update at each stage
                </a>{" "}
                ·{" "}
                <a href="#weekly-checklist" className="text-blue-600 hover:underline">
                  weekly checklist
                </a>{" "}
                ·{" "}
                <a href="#common-mistakes" className="text-blue-600 hover:underline">
                  common mistakes
                </a>
              </p>
            </Prose>
          </GuideSection>

          {/* ------------------------------------------------------------ */}
          <GuideSection id="journey" number={2} title="The APEL Q journey at a glance">
            <Card>
              <ol className="relative xl:grid xl:grid-cols-9">
                {JOURNEY.map((s, i) => (
                  <li
                    key={s.label}
                    className="relative flex gap-3 pb-5 last:pb-0 xl:flex-col xl:items-center xl:gap-2 xl:pb-0 xl:text-center"
                  >
                    {i < JOURNEY.length - 1 && (
                      <span
                        aria-hidden
                        className="absolute bottom-0 left-[15px] top-8 w-0.5 bg-gray-200 xl:bottom-auto xl:left-[calc(50%+20px)] xl:right-[calc(-50%+20px)] xl:top-[15px] xl:h-0.5 xl:w-auto"
                      />
                    )}
                    <span
                      className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${s.circle}`}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 pt-1 xl:pt-0">
                      <p className="text-sm font-semibold text-gray-900 xl:text-xs">
                        {s.label}
                      </p>
                      <p className="text-xs text-gray-500 xl:text-[10px] xl:leading-tight">
                        {s.record}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
                The grey text under each step is what you record in the tracker
                at that point. Stage values go in <UI>Assessment Stage</UI>.
              </p>
            </Card>

            <Card>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                Entry requirement
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-gray-700">
                <li>Master (MQF Level 7).</li>
                <li>No age or academic requirement.</li>
                <li>At least 20 years of work experience in a related field.</li>
              </ul>
            </Card>

            <SubSection id="early-screening" title="Early screening">
              <Steps>
                <Step>
                  <UI>Register at MQA website.</UI> The candidate submits the
                  MQA form. The APEL Centre tells the EC whether the candidate
                  can go to briefing or needs further assessment with the
                  faculty.
                </Step>
                <Step>
                  <UI>APEL Q Briefing.</UI> The candidate confirms a date and
                  attends. The APEL Centre sends a post-briefing email with next
                  steps.
                </Step>
                <Step>
                  <UI>Register &amp; payment.</UI> The candidate pays the RM
                  1,500 registration fee and gives all documents to the APEL
                  Centre and their EC.
                </Step>
                <Step>
                  <UI>Advisor assigned.</UI> Self-Assessment starts. The
                  candidate has a maximum of 45 days from advisor assignment to
                  complete it. The Programme Offer Letter is issued only after
                  the candidate submits the “Completed Self Assessment” form to
                  the APEL Centre.
                </Step>
              </Steps>
              <Callout tone="info">
                <p>
                  <UI>Assessment Stage</UI> has no value for early screening —
                  the first value is <StageBadge value="SELF ASSESSMENT" />. So a
                  candidate in early screening won’t appear in the Dashboard’s
                  Pipeline until their advisor is assigned.
                </p>
              </Callout>
              <ToConfirm>
                <p>
                  Which <UI>Learner Status</UI> to use for a candidate who is
                  still in early screening (for example{" "}
                  <StatusBadge value="PENDING" />
                  ).
                </p>
              </ToConfirm>
            </SubSection>

            <SubSection id="modules" title="The four modules">
              <Prose>
                <p>
                  The 4 modules must be passed in order. Capstone starts only
                  after Portfolio, FVV and Challenge Test are passed. Total: 38
                  weeks.
                </p>
              </Prose>

              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th scope="col" className="px-3 py-2">Step</th>
                      <th scope="col" className="px-3 py-2">Module</th>
                      <th scope="col" className="px-3 py-2">Total</th>
                      <th scope="col" className="px-3 py-2">Breakdown</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 align-top">
                    {MODULES.map((m) => (
                      <tr key={m.step}>
                        <td className="px-3 py-2 text-gray-500">{m.step}</td>
                        <td className="px-3 py-2 font-medium text-gray-900">{m.name}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-700">{m.total}</td>
                        <td className="px-3 py-2 text-gray-700">
                          <ul className="space-y-0.5">
                            {m.breakdown.map((b) => (
                              <li key={b}>{b}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs italic text-gray-500">
                The duration of study for MBA are calculated based on the
                optimum number of hours spent in a week by students to complete
                each task.
              </p>

              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {MODULES.map((m) => (
                  <div key={m.step} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <dt className="text-sm font-semibold text-gray-900">{m.name}</dt>
                    <dd className="mt-1 text-sm leading-6 text-gray-700">{m.about}</dd>
                  </div>
                ))}
              </dl>
            </SubSection>
          </GuideSection>

          {/* ------------------------------------------------------------ */}
          <GuideSection id="what-to-update" number={3} title="What to update at each stage">
            <Prose>
              <p>
                Each card below is one thing that happens to a learner. Open the
                learner’s record, change the fields listed, then click{" "}
                <Btn>Save changes</Btn>. Nothing saves on its own.
              </p>
            </Prose>

            <EventCard
              id="event-new-candidate"
              when="New candidate registered on MQA"
              where={
                <>
                  Create the learner: Learners → <Btn>+ Add learner</Btn> →{" "}
                  <Btn>Create learner</Btn>
                </>
              }
              rows={[
                { section: "Learner Details Information", field: "Name (as per IC / Passport)", value: <><Entry>Full name as on the IC or passport</Entry> <Required /></> },
                { section: "Learner Details Information", field: "IC / Passport No", value: <><Entry>IC or passport number</Entry> <Required /></> },
                { section: "Learner Details Information", field: "Email Address 1", value: <><Entry>Main email</Entry> <Required /></> },
                { section: "Learner Details Information", field: "Assigned Counsellor", value: <Entry>Counsellor’s name</Entry> },
                { section: "Learner Details Information", field: "Programme Details", value: <Entry>Programme applied for</Entry> },
                { section: "Learner Details Information", field: "MQA Approval Date", value: <Entry>Date</Entry> },
                { section: "Learner Details Information", field: "Sponsor", value: vals(SPONSORS) },
                { section: "Learner Details Information", field: "Learner Status", value: <>{LEARNER_STATUSES.map((s) => <StatusBadge key={s} value={s} />)}<span className="text-xs text-gray-500">(see To confirm)</span></> },
                { section: "Learner Details Information", field: "Contact No 1, Contact No 2, Email Address 2", value: <Entry>Contact details</Entry> },
                { section: "Learner Details Information", field: "Nationality", value: <Entry>Pick from the list</Entry> },
                { section: "Learner Details Information", field: "Company Details, Position / Title", value: <Entry>Current employer and job title</Entry> },
                { section: "Screening Outcome", field: "Years of Experience", value: <Entry>A number, e.g. 22</Entry> },
                { section: "Screening Outcome", field: "Candidate Background", value: <Entry>Summary from screening</Entry> },
              ]}
            >
              <p>
                <strong>Before you start:</strong> search the Learners list by
                IC / Passport No to make sure the learner isn’t already there.
              </p>
              <p>
                <UI>Matric Number</UI> is also on this form. Fill it in if the
                learner has one.
              </p>
              <ToConfirm>
                <p>
                  Which <UI>Learner Status</UI> to set for a new candidate, and
                  what each status means — especially <StatusBadge value="INACTIVE" />{" "}
                  versus <StatusBadge value="PENDING" />.
                </p>
              </ToConfirm>
            </EventCard>

            <EventCard
              id="event-fee-paid"
              when="Registration fee paid"
              where="Learner record → Payment Records"
              rows={[
                { section: "Payment Records", field: "Registration Payment Status", value: <><PaymentBadge value="PAID" /><Or /><PaymentBadge value="WAIVED" /></> },
                { section: "Payment Records", field: "Date of Payment", value: <Entry>Date the fee was paid</Entry> },
              ]}
            >
              <p>
                The Dashboard’s <UI>Unpaid registration</UI> tile counts only
                learners set to <PaymentBadge value="UNPAID" />. A blank status
                isn’t counted anywhere. So set <PaymentBadge value="UNPAID" />{" "}
                when you create the learner, and change it when the RM 1,500
                fee comes in.
              </p>
              <ToConfirm>
                <p>
                  When <PaymentBadge value="WAIVED" /> applies, and who approves
                  a waiver.
                </p>
              </ToConfirm>
            </EventCard>

            <EventCard
              id="event-advisor-assigned"
              when="Advisor assigned"
              where="Learner record → Assessor Details, Learner Details Information and Learner Progress Information"
              rows={[
                { section: "Assessor Details", field: "Advisor", value: <Entry>Pick the advisor</Entry> },
                { section: "Assessor Details", field: "Advisor Appointment Date", value: <Entry>Date of appointment</Entry> },
                { section: "Learner Details Information", field: "Assessment Stage", value: <StageBadge value="SELF ASSESSMENT" /> },
                { section: "Learner Progress Information", field: "Self-Assessment Status", value: <Val>ONGOING</Val> },
              ]}
            >
              <p>
                Click <Btn>Save changes</Btn>. Saving creates the advisor’s
                assignment for the <StageBadge value="SELF ASSESSMENT" /> stage
                for you. <strong>Don’t add it again</strong> on the Advisors
                page — that makes a duplicate. Instead, open the new assignment
                and fill in its details. See{" "}
                <a href="#assign-personnel" className="text-blue-600 hover:underline">
                  Assign advisors, assessors and moderators
                </a>
                .
              </p>
              <p>
                If the advisor isn’t in the dropdown, add them on the{" "}
                <Link href="/advisors" className="text-blue-600 hover:underline">
                  Advisors
                </Link>{" "}
                page first.
              </p>
              <Callout tone="info">
                <p>
                  The learner has a maximum of 45 days from advisor assignment
                  to complete Self-Assessment. The tracker doesn’t flag this for
                  you — it’s on the{" "}
                  <a href="#weekly-checklist" className="underline">
                    weekly checklist
                  </a>
                  .
                </p>
              </Callout>
            </EventCard>

            <EventCard
              id="event-self-assessment-done"
              when="Self-Assessment done"
              where="Learner record → Learner Progress Information"
              rows={[
                { section: "Learner Progress Information", field: "Self-Assessment Status", value: <Val>COMPLETED</Val> },
                { section: "Learner Progress Information", field: "Self-Assessment Date Completed", value: <Entry>Date</Entry> },
              ]}
            >
              <p>
                The Programme Offer Letter is issued only after the candidate
                submits the “Completed Self Assessment” form to the APEL Centre.
              </p>
              <ToConfirm>
                <p>
                  When to use <Val>NOT COMPLETED</Val> (for example, if the 45
                  days pass), and what happens to the learner then.
                </p>
                <p>
                  Which date goes in <UI>Self-Assessment Date Completed</UI>:
                  the day the learner finished, or the day the APEL Centre
                  received the form.
                </p>
              </ToConfirm>
            </EventCard>

            <EventCard
              id="event-offer-letter"
              when="Offer letter issued"
              where="Learner record → Learner Progress Information"
              rows={[
                { section: "Learner Progress Information", field: "Offer Letter Issued Date", value: <Entry>Date the letter was issued</Entry> },
              ]}
            >
              <p>
                This date starts the learner’s 12-month window. Without it, the
                learner is counted under <UI>No offer letter</UI> on the
                Dashboard and their window isn’t tracked at all. Read{" "}
                <a href="#twelve-month-window" className="text-blue-600 hover:underline">
                  how the 12-month window works
                </a>
                .
              </p>
            </EventCard>

            <SubSection id="twelve-month-window" title="How the 12-month window works">
              <Card>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Example learner record header
                </p>
                <p className="text-xl font-bold text-gray-900">TEST LEARNER</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge value="ACTIVE" />
                  <StageBadge value="PORTFOLIO" />
                  <div className="w-44">
                    <WindowMeter months={4.3} />
                  </div>
                </div>
              </Card>

              <Steps>
                <Step>
                  The window starts on the <UI>Offer Letter Issued Date</UI>.
                </Step>
                <Step>
                  The tracker counts the days since that date and divides by
                  30.44 (the average number of days in a month). For example,
                  183 days is 6 months.
                </Step>
                <Step>
                  It then shows the learner as one of these:
                  <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200 bg-white">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <tr>
                          <th scope="col" className="px-3 py-2">Time since offer letter</th>
                          <th scope="col" className="px-3 py-2">Meter</th>
                          <th scope="col" className="px-3 py-2">Dashboard</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <tr>
                          <td className="px-3 py-2">Under 9 months</td>
                          <td className="px-3 py-2"><WindowMeter months={4.3} /></td>
                          <td className="px-3 py-2">On track</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2">9 months up to 12</td>
                          <td className="px-3 py-2"><WindowMeter months={10.2} /></td>
                          <td className="px-3 py-2">Nearing limit (9–12 mo)</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2">12 months or more</td>
                          <td className="px-3 py-2"><WindowMeter months={14.5} /></td>
                          <td className="px-3 py-2">Overdue, and the Window overdue tile</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2">No date entered</td>
                          <td className="px-3 py-2 text-xs text-gray-400">—</td>
                          <td className="px-3 py-2">No offer letter</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    “Overdue 2 mo” means 2 whole months past the 12-month mark.
                  </p>
                </Step>
                <Step>
                  You’ll see the meter in the Learners list (<UI>12-month window</UI>{" "}
                  column), at the top of the learner record, and under the{" "}
                  <UI>Offer Letter Issued Date</UI> field.
                </Step>
              </Steps>

              <Callout tone="info" title="Who the Dashboard counts">
                <p>
                  <UI>12-Month Window Health</UI> and <UI>Window overdue</UI>{" "}
                  count only in-progress learners: anyone whose{" "}
                  <UI>Assessment Stage</UI> is <em>not</em>{" "}
                  <StageBadge value="COMPLETED" /> or{" "}
                  <StageBadge value="GRADUATED" />. That includes learners with
                  a blank stage, and learners whose <UI>Learner Status</UI> is{" "}
                  <StatusBadge value="WITHDRAW" /> or{" "}
                  <StatusBadge value="INACTIVE" />.
                </p>
                <p>
                  The meter in the Learners list and on the record keeps running
                  even after a learner completes. Ignore it for completed and
                  graduated learners.
                </p>
              </Callout>
              <ToConfirm>
                <p>
                  What must be finished inside the 12 months, and what to do
                  when a learner goes over.
                </p>
                <p>
                  Whether withdrawn learners should count in 12-Month Window
                  Health. At the moment they do.
                </p>
              </ToConfirm>
            </SubSection>

            <EventCard
              id="event-module-start"
              when="Learner starts a module"
              where="Learner record → Learner Details Information"
              rows={[
                {
                  section: "Learner Details Information",
                  field: "Assessment Stage",
                  value: (
                    <>
                      {["PORTFOLIO", "FVV", "CHALLENGE TEST", "CAPSTONE"].map((s) => (
                        <StageBadge key={s} value={s} />
                      ))}
                      <span className="text-xs text-gray-500">— the module they’re starting</span>
                    </>
                  ),
                },
              ]}
            >
              <p>
                Set the stage when the learner <em>starts</em> the module, not
                when they finish it. Modules go in order: Portfolio, FVV,
                Challenge Test, then Capstone.
              </p>
              <p>
                When you save a new stage, everyone named in{" "}
                <UI>Assessor Details</UI> gets a new assignment for that stage.
                Their assignments for earlier stages stay as they were.
              </p>
            </EventCard>

            <EventCard
              id="event-module-result"
              when="Module result is in"
              where="Learner record → Learner Progress Information, and Milestones & Claims (dates based on AEB)"
              rows={[
                { section: "Results by assessment instrument — that module’s row", field: "Status (Pass / Fail)", value: <><ResultBadge value="PASS" /><Or /><ResultBadge value="FAIL" /></> },
                { section: "Results by assessment instrument — that module’s row", field: "GPA", value: <Entry>0.00 to 4.00</Entry> },
                { section: "Results by assessment instrument — that module’s row", field: "CGPA", value: <Entry>0.00 to 4.00</Entry> },
                { section: "Milestones & Claims (dates based on AEB)", field: "The module’s date (see table)", value: <Entry>Date, based on AEB</Entry> },
              ]}
            >
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th scope="col" className="px-3 py-2">Instrument Level row</th>
                      <th scope="col" className="px-3 py-2">Date field</th>
                      <th scope="col" className="px-3 py-2">Comes next in the form</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {MODULE_FIELDS.map((m) => (
                      <tr key={m.stage}>
                        <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-900">{m.stage}</td>
                        <td className="whitespace-nowrap px-3 py-2">{m.date}</td>
                        <td className="px-3 py-2 text-gray-600">{m.claim ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                In <UI>Milestones &amp; Claims (dates based on AEB)</UI> the
                fields run in this order: Portfolio Date, FVV Date,{" "}
                <UI>Claim Submission 1 to APEL Centre (RM)</UI>, Challenge Test
                Date, Capstone Date,{" "}
                <UI>Claim Submission 2 to APEL Centre (RM)</UI>. The two claim
                fields take an amount in RM.
              </p>
              <Callout tone="tip">
                <p>
                  The form says: “Leave a row blank until that instrument has
                  been assessed.” Don’t fill in a result, GPA or CGPA in advance.
                </p>
              </Callout>
              <ToConfirm>
                <p>What to do when a learner gets <ResultBadge value="FAIL" /> (resit, stage, status).</p>
                <p>Exactly which AEB date goes in each module’s date field.</p>
                <p>What the two claim amounts cover, and when to fill them in.</p>
              </ToConfirm>
            </EventCard>

            <EventCard
              id="event-assessor-appointed"
              when="Internal Assessor, External Assessor or Moderator appointed"
              where="Learner record → Assessor Details"
              rows={[
                { section: "Assessor Details", field: "Internal Assessor + Internal Assessor Appointment Date", value: <Entry>Name and date</Entry> },
                { section: "Assessor Details", field: "External Assessor + External Assessor Appointment Date", value: <Entry>Name and date</Entry> },
                { section: "Assessor Details", field: "Moderator + Moderator Appointment Date", value: <Entry>Name and date</Entry> },
              ]}
            >
              <p>
                Click <Btn>Save changes</Btn>. As with advisors, saving creates
                the assignment for the learner’s current stage. Open it under{" "}
                <UI>Personnel Assignments</UI> on the learner record (or on the
                Assessors &amp; Moderators page), click{" "}
                <UI>Edit assignment</UI>, and fill in{" "}
                <UI>Appointment Letter Status</UI>, <UI>Payment Mode</UI>,{" "}
                <UI>Claim Status</UI> and <UI>Remarks</UI>. Moderator
                assignments have no Payment Mode or Claim Status.
              </p>
              <p>
                If the person isn’t in the dropdown, add them on the{" "}
                <Link href="/internal-assessors" className="text-blue-600 hover:underline">
                  Assessors &amp; Moderators
                </Link>{" "}
                page first.
              </p>
            </EventCard>

            <EventCard
              id="event-completed"
              when="All four modules passed"
              where="Learner record → Learner Details Information and Learner Progress Information"
              rows={[
                { section: "Learner Details Information", field: "Assessment Stage", value: <StageBadge value="COMPLETED" /> },
                { section: "Learner Progress Information", field: "Senate Date", value: <Entry>Date, when the Senate endorses</Entry> },
                { section: "Learner Details Information", field: "Assessment Stage (after Senate)", value: <StageBadge value="GRADUATED" /> },
              ]}
            >
              <p>
                Once the stage is <StageBadge value="COMPLETED" /> or{" "}
                <StageBadge value="GRADUATED" />, the learner counts in{" "}
                <UI>Completed / Graduated</UI> and drops out of 12-Month Window
                Health and Lead Ageing.
              </p>
              <ToConfirm>
                <p>
                  Whether <UI>Learner Status</UI> should change when a learner
                  completes or graduates.
                </p>
              </ToConfirm>
            </EventCard>

            <EventCard
              id="event-withdraw"
              when="Learner drops out"
              where="Learner record → Learner Details Information and Learner Progress Information"
              rows={[
                { section: "Learner Details Information", field: "Learner Status", value: <StatusBadge value="WITHDRAW" /> },
                { section: "Learner Progress Information", field: "Remark", value: <Entry>Why and when they withdrew</Entry> },
              ]}
            >
              <p>
                Don’t use <Btn>Delete learner</Btn>. Deleting removes the
                record, its notes and its documents permanently, and the learner
                disappears from every report.
              </p>
              <p>
                A withdrawn learner still counts in 12-Month Window Health and
                Lead Ageing unless their <UI>Assessment Stage</UI> is{" "}
                <StageBadge value="COMPLETED" /> or{" "}
                <StageBadge value="GRADUATED" />.
              </p>
              <ToConfirm>
                <p>
                  Whether to change <UI>Assessment Stage</UI> when a learner
                  withdraws, and what to do if they come back.
                </p>
              </ToConfirm>
            </EventCard>
          </GuideSection>

          {/* ------------------------------------------------------------ */}
          <GuideSection id="how-to" number={4} title="How-to guides">
            <SubSection id="add-learner" title="Add a learner">
              <Steps>
                <Step>
                  Search for the learner’s IC / Passport No first (see{" "}
                  <a href="#find-learner" className="text-blue-600 hover:underline">Find a learner</a>).
                  If they’re already there, update that record instead.
                </Step>
                <Step>
                  Go to <Link href="/" className="text-blue-600 hover:underline">Learners</Link> and
                  click <Btn>+ Add learner</Btn>.
                </Step>
                <Step>
                  Fill in the three required fields, marked with a red *:{" "}
                  <UI>Name (as per IC / Passport)</UI>, <UI>IC / Passport No</UI>{" "}
                  and <UI>Email Address 1</UI>.
                </Step>
                <Step>
                  Fill in everything else you know. See{" "}
                  <a href="#event-new-candidate" className="text-blue-600 hover:underline">New candidate registered on MQA</a>.
                </Step>
                <Step>
                  Optional: attach one document in <UI>Documents (optional)</UI>{" "}
                  at the bottom. Choose the file in <UI>Document</UI>, then a{" "}
                  <UI>Document Category</UI> and <UI>Uploaded By</UI> (your
                  name). The file is attached only after the learner is created.
                  Max {MAX_DOCUMENT_SIZE_MB} MB.
                </Step>
                <Step>
                  Click <Btn>Create learner</Btn>. The new learner record opens.
                  Add more documents there.
                </Step>
              </Steps>
            </SubSection>

            <SubSection id="bulk-upload" title="Bulk upload">
              <Prose>
                <p>
                  Use bulk upload to add many learners from a spreadsheet. You
                  see a preview of every row before anything is saved.
                </p>
              </Prose>
              <Steps>
                <Step>
                  Go to <Link href="/" className="text-blue-600 hover:underline">Learners</Link> and
                  click <Btn>Bulk upload</Btn>.
                </Step>
                <Step>
                  Click <UI>Download template</UI>. It has one column per field,
                  and an <UI>Accepted values</UI> sheet.
                </Step>
                <Step>
                  <strong>Delete the example row</strong> in the template. It’s
                  sample data, and it will be imported as a real learner if you
                  leave it.
                </Step>
                <Step>
                  Enter one learner per row. These columns are required:{" "}
                  {REQUIRED_IMPORT_FIELDS.map((f, i) => (
                    <span key={f.key}>
                      {i > 0 && ", "}
                      <UI>{f.label}</UI>
                    </span>
                  ))}
                  . Save as .xlsx or CSV. Max {MAX_IMPORT_ROWS.toLocaleString("en-MY")} rows
                  and {MAX_IMPORT_SIZE_MB} MB per upload.
                </Step>
                <Step>
                  Choose your file under <UI>Spreadsheet</UI>.
                </Step>
                <Step>
                  Under <UI>If a learner already exists</UI>, choose{" "}
                  <Val>Skip the row (safest)</Val> or{" "}
                  <Val>Update the existing learner</Val>. Existing learners are
                  matched on IC / Passport No (spaces and dashes are ignored).
                </Step>
                <Step>
                  Click <Btn>Preview import</Btn>.
                </Step>
                <Step>
                  Review <UI>2. Check and import</UI>: how many rows are{" "}
                  <em>to create</em>, <em>to update</em> and <em>skipped</em>,
                  any ignored columns, and the list of rows with errors. Fix
                  errors in your file and preview again if needed.
                </Step>
                <Step>
                  Click <Btn>Import N learners</Btn> (N is the number of rows
                  to import) to confirm. Skipped rows are not written.
                </Step>
              </Steps>

              <Callout tone="warning" title="Careful with “Update the existing learner”">
                <p>
                  An update replaces <strong>every</strong> field of the
                  matched learner. Any column that is blank — or missing from
                  your file — is cleared on that learner, including dates,
                  assessors and results.
                </p>
                <p>
                  Use <Val>Skip the row (safest)</Val> unless your file has
                  every column filled in for those learners. To change one or two
                  fields, edit the learner record instead.
                </p>
              </Callout>

              <Prose>
                <p>
                  <strong>Dates</strong> can be YYYY-MM-DD or DD/MM/YYYY. Slash
                  dates are read day first, so 03/04/2026 is 3 April 2026.
                </p>
                <p>
                  <strong>Headers</strong> are matched loosely: capitals,
                  spaces and punctuation don’t matter. Unknown columns are
                  ignored. If the same IC / Passport No appears twice in your
                  file, the second row is skipped.
                </p>
                <p>
                  <strong>Column names differ slightly</strong> from the form:
                  the template uses <UI>Name</UI> (not Name (as per IC /
                  Passport)), <UI>Progress Remark</UI> for the form’s Remark,
                  and <UI>Claim Submission 1 (RM)</UI> /{" "}
                  <UI>Claim Submission 2 (RM)</UI>.
                </p>
              </Prose>

              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <caption className="px-3 pt-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
                    Accepted values in bulk upload
                  </caption>
                  <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th scope="col" className="px-3 py-2">Column</th>
                      <th scope="col" className="px-3 py-2">Accepted values</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 align-top">
                    {LEARNER_IMPORT_FIELDS.filter((f) => f.options).map((f) => (
                      <tr key={f.key}>
                        <td className="px-3 py-2 font-medium text-gray-900">{f.label}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">{vals(f.options ?? [])}</div>
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td className="px-3 py-2 font-medium text-gray-900">
                        Advisor, Internal Assessor, External Assessor, Moderator
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        The person’s name spelled exactly as in the Advisors or
                        Assessors &amp; Moderators list. See{" "}
                        <a href="#add-personnel" className="text-blue-600 hover:underline">why</a>.
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-medium text-gray-900">Nationality</td>
                      <td className="px-3 py-2 text-gray-700">
                        A country name exactly as in the form’s list, e.g.
                        Malaysia.
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-medium text-gray-900">Any date column</td>
                      <td className="px-3 py-2 text-gray-700">YYYY-MM-DD or DD/MM/YYYY (day first)</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-medium text-gray-900">Any number column</td>
                      <td className="px-3 py-2 text-gray-700">A number, e.g. 8 or 1200.50</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500">
                Capitals don’t matter in dropdown columns, and a clear
                shortening is accepted (WITHDRAWN is read as WITHDRAW). Stick to
                the values above to be safe.
              </p>
            </SubSection>

            <SubSection id="find-learner" title="Find a learner">
              <Steps>
                <Step>
                  Go to <Link href="/" className="text-blue-600 hover:underline">Learners</Link>.
                </Step>
                <Step>
                  Type in <UI>Search</UI>. It looks at name, matric number and
                  IC / passport number, and the list updates as you type.
                </Step>
                <Step>
                  Narrow the list with <UI>Status</UI> (Learner Status) and{" "}
                  <UI>Stage</UI> (Assessment Stage). Click <UI>Clear</UI> to
                  reset.
                </Step>
                <Step>
                  At the bottom, choose how many rows to show with{" "}
                  <UI>Rows</UI> ({PAGE_SIZES.join(" / ")}) and move between
                  pages with <UI>Previous</UI> and <UI>Next</UI>.
                </Step>
                <Step>Click a learner’s name to open their record.</Step>
              </Steps>
              <p className="text-sm text-gray-600">
                The <UI>Stage</UI> filter can’t show learners with a blank
                stage. To find them, use a{" "}
                <a href="#reports" className="text-blue-600 hover:underline">report</a>.
              </p>
            </SubSection>

            <SubSection id="update-learner" title="Update a learner’s progress">
              <Steps>
                <Step>Open the learner’s record from the Learners list.</Step>
                <Step>
                  Change the fields you need. The record is always editable —
                  there is no separate Edit button.
                </Step>
                <Step>
                  Click <Btn>Save changes</Btn>. It’s in the bar at the top
                  (which stays on screen as you scroll) and at the bottom of the
                  form.
                </Step>
                <Step>
                  Check the message next to the button says <em>Saved</em> and
                  a time.
                </Step>
              </Steps>
              <Card>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Example: the save bar on TEST LEARNER’s record
                </p>
                <div aria-hidden className="flex flex-wrap items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
                  <span className="text-xs font-medium text-amber-700">Unsaved changes</span>
                  <span className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                    Save changes
                  </span>
                  <span className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-600">
                    Delete learner
                  </span>
                </div>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">
                  <li><span className="font-medium text-amber-700">Unsaved changes</span> — you’ve edited something and not saved it.</li>
                  <li><span className="font-medium text-gray-600">Saving…</span> — wait for it to finish.</li>
                  <li><span className="font-medium text-green-700">Saved</span> followed by the time — done.</li>
                  <li><span className="font-medium text-red-700">Red text</span> — the save failed. Read the message, fix the field and save again.</li>
                </ul>
              </Card>
              <Callout tone="tip">
                <p>
                  Nothing saves automatically. If you try to leave with unsaved
                  changes, your browser warns you. Notes, documents and
                  assignments have their own buttons and save separately — click{" "}
                  <Btn>Save changes</Btn> on the form first.
                </p>
              </Callout>
            </SubSection>

            <SubSection id="assign-personnel" title="Assign advisors, assessors and moderators">
              <Prose>
                <p>Advisors, assessors and moderators are recorded in two places:</p>
              </Prose>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Card>
                  <p className="text-sm font-semibold text-gray-900">(a) Assessor Details</p>
                  <p className="mt-1 text-xs text-gray-500">On the learner record</p>
                  <p className="mt-2 text-sm leading-6 text-gray-700">
                    <em>Who</em> the learner’s current Advisor, Internal
                    Assessor, External Assessor and Moderator are, plus each
                    appointment date. This feeds the Learners list, Advisor
                    Load on the Dashboard, and Reports.
                  </p>
                </Card>
                <Card>
                  <p className="text-sm font-semibold text-gray-900">(b) Assignments</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Under Personnel Assignments on the learner record, and on the
                    Advisors and Assessors &amp; Moderators pages
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-700">
                    One per person per stage: <UI>Stage</UI>,{" "}
                    <UI>Appointment Date</UI>, <UI>Appointment Letter Status</UI>{" "}
                    <InlineVals list={APPOINTMENT_LETTER_STATUSES} />,{" "}
                    <UI>Payment Mode</UI> <InlineVals list={ADVISOR_PAYMENT_MODES} />,{" "}
                    <UI>Claim Status</UI> and <UI>Remarks</UI>.
                  </p>
                </Card>
              </div>

              <Callout tone="info" title="How the two places sync — one way only">
                <p>
                  When you save a learner, each name in Assessor Details is
                  copied into an assignment for the learner’s current{" "}
                  <UI>Assessment Stage</UI>, with its appointment date. If that
                  person’s role already has an assignment for that stage, it is
                  updated; if not, a new one is created. Bulk upload does the
                  same.
                </p>
                <p>
                  It never works the other way. Adding or editing an assignment
                  does not change Assessor Details. Removing a name from
                  Assessor Details does not remove its assignments.
                </p>
                <p>
                  If the stage is <StageBadge value="COMPLETED" />,{" "}
                  <StageBadge value="GRADUATED" /> or blank, the assignment is
                  saved with no stage.
                </p>
              </Callout>

              <h4 className="pt-2 text-sm font-semibold text-gray-900">Do it in this order</h4>
              <Steps>
                <Step>
                  On the learner record, in <UI>Assessor Details</UI>, pick the
                  person and enter their appointment date. Click{" "}
                  <Btn>Save changes</Btn>.
                </Step>
                <Step>
                  Scroll to <UI>Personnel Assignments</UI>. Find the new card and
                  click <UI>Edit assignment</UI>.
                </Step>
                <Step>
                  Set <UI>Appointment Letter Status</UI>, <UI>Payment Mode</UI>,{" "}
                  <UI>Claim Status</UI> and <UI>Remarks</UI>. Click{" "}
                  <Btn>Save</Btn>.
                </Step>
                <Step>
                  As the claim moves along, update <UI>Claim Status</UI> (
                  {CLAIM_STATUSES.map((s, i) => (
                    <span key={s}>
                      {i > 0 && " "}
                      <ClaimStatusBadge value={s} />
                    </span>
                  ))}
                  ) here or on the{" "}
                  <Link href="/advisors" className="text-blue-600 hover:underline">Advisors</Link> or{" "}
                  <Link href="/internal-assessors" className="text-blue-600 hover:underline">Assessors &amp; Moderators</Link>{" "}
                  page.
                </Step>
              </Steps>

              <Callout tone="warning" title="Keep the appointment date in Assessor Details">
                <p>
                  Every time you save the learner, the appointment date in
                  Assessor Details is copied onto the current stage’s
                  assignment — even if it’s blank. If you change the date only
                  on the assignment, the next save of the learner overwrites it.
                </p>
              </Callout>

              <Prose>
                <p>
                  <strong>When to use + Add assignment.</strong> On the Advisors
                  or Assessors &amp; Moderators page, each person has{" "}
                  <UI>+ Add assignment</UI> (fields: <UI>Learner</UI>,{" "}
                  <UI>Stage</UI>, <UI>Appointment Date</UI>,{" "}
                  <UI>Appointment Letter Status</UI>, <UI>Payment Mode</UI>,{" "}
                  <UI>Claim Status</UI>, <UI>Remarks</UI>, then{" "}
                  <Btn>Add assignment</Btn>). Use it only for an assignment
                  that isn’t the learner’s current one — for example, an earlier
                  stage that was never recorded. Adding one for the current
                  stage makes a duplicate.
                </p>
                <p>
                  <strong>Moderators</strong> are not paid through this
                  process, so their assignments have no Payment Mode or Claim
                  Status.
                </p>
                <p>
                  On the role pages, <UI>Learners assigned</UI> counts
                  assignments, not people. A learner assigned to the same
                  advisor for three stages counts as 3.
                </p>
                <p>
                  <UI>Remove</UI> on an assignment deletes it and its
                  documents.
                </p>
              </Prose>
            </SubSection>

            <SubSection id="add-personnel" title="Add a new advisor, assessor or moderator to the lists">
              <Prose>
                <p>
                  The Assessor Details dropdowns only show people on these
                  lists. Add someone before you assign them.
                </p>
              </Prose>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Object.values(ROLE_CONFIG).map((c) => (
                  <div key={c.role} className="rounded-lg border border-gray-200 bg-white p-4 text-sm leading-6 text-gray-700 shadow-sm">
                    <p className="font-semibold text-gray-900">{c.label}</p>
                    <ol className="mt-1 list-decimal space-y-0.5 pl-5">
                      <li>
                        Go to{" "}
                        {c.role === "ADVISOR" ? (
                          <Link href={c.route} className="text-blue-600 hover:underline">Advisors</Link>
                        ) : (
                          <>
                            <Link href={c.route} className="text-blue-600 hover:underline">Assessors &amp; Moderators</Link>{" "}
                            → <UI>{c.plural}</UI> tab
                          </>
                        )}
                        .
                      </li>
                      <li>
                        Type the name in <UI>{c.label} name</UI>
                        {c.role === "ADVISOR" && <> (and an optional <UI>Remark</UI>)</>}.
                      </li>
                      <li>
                        Click <Btn>+ Add {c.label.toLowerCase()}</Btn>.
                      </li>
                    </ol>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-700">
                To fix a spelling, open <UI>Edit {INTERNAL.label.toLowerCase()}</UI>{" "}
                (or <UI>Edit advisor</UI>, etc.) under the person, change the
                name and click <Btn>Save</Btn>.
              </p>

              <Callout tone="warning" title="Renaming or deleting someone doesn’t update learners">
                <p>
                  Learner records and assignments store the person’s name as
                  text. Renaming or deleting someone on the list leaves the old
                  name on every learner and assignment.
                </p>
                <p>
                  If a learner’s saved name isn’t on the list, their dropdown
                  shows <Val>— Not assigned —</Val>, and saving that learner{" "}
                  <strong>clears the name</strong>. Before you save, check the
                  Assessor Details dropdowns still show the right people. The
                  same applies to <UI>Nationality</UI>.
                </p>
              </Callout>

              <Card>
                <p className="text-sm font-semibold text-gray-900">
                  “{ORPHAN_NOTICE}”
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-700">
                  You see this on the Advisors or Assessors &amp; Moderators page
                  when assignments use a name that doesn’t exactly match anyone
                  on that list. It happens when a name was typed differently in
                  a bulk upload, or the person was renamed or deleted.
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-900">How to fix it</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-gray-700">
                  <li>
                    If the name is correct: add the person to the list with
                    exactly the same spelling as the heading. Their assignments
                    then appear under them.
                  </li>
                  <li>
                    If the name is wrong: on each affected learner, pick the
                    correct person in Assessor Details and save. Then{" "}
                    <UI>Remove</UI> the old assignment with the wrong name.
                  </li>
                </ul>
              </Card>
            </SubSection>

            <SubSection id="documents" title="Upload documents">
              <Prose>
                <p>You can attach files in two places:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    <strong>On the learner record</strong>, in the{" "}
                    <UI>Documents</UI> section. The <UI>Upload</UI> link in the
                    Learners list jumps straight there.
                  </li>
                  <li>
                    <strong>On an assignment</strong> (for example an
                    appointment letter or claim form): open{" "}
                    <UI>Documents (n)</UI> on the assignment card.
                  </li>
                </ul>
              </Prose>
              <Steps>
                <Step>
                  Choose the file in <UI>Document</UI>. Allowed: {ALLOWED_FILES}.
                  Max {MAX_DOCUMENT_SIZE_MB} MB.
                </Step>
                <Step>
                  Choose a <UI>Category</UI>:{" "}
                  <span className="inline-flex flex-wrap gap-1 align-middle">{vals(DOCUMENT_CATEGORIES)}</span>
                </Step>
                <Step>Type <UI>Your name</UI>.</Step>
                <Step>Click <Btn>Upload</Btn>.</Step>
              </Steps>
              <p className="text-sm text-gray-700">
                Each file has <UI>Download</UI>, <UI>Replace</UI> and{" "}
                <UI>Delete</UI>. Removing an assignment deletes its documents
                too.
              </p>
            </SubSection>

            <SubSection id="folder-links" title="External Folder Links">
              <Prose>
                <p>
                  Use <UI>Folder Links</UI> (in the <UI>External Folder Links</UI>{" "}
                  section of the learner record) to point to evidence folders on
                  Google Drive, SharePoint or OneDrive.
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Put one link per line.</li>
                  <li>
                    To give a link a name, type the name, then <code>|</code>,
                    then the link.
                  </li>
                  <li>Click <Btn>Save changes</Btn>. Saved links become clickable under the box.</li>
                  <li>Only links starting with http:// or https:// become clickable.</li>
                </ul>
              </Prose>
              <pre className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-800">
{`Portfolio evidence | https://drive.google.com/drive/folders/…
https://unitar.sharepoint.com/sites/apel/…`}
              </pre>
            </SubSection>

            <SubSection id="notes-follow-ups" title="Notes and follow-ups">
              <Prose>
                <p>
                  Every learner record has a <UI>Notes &amp; Follow-ups</UI>{" "}
                  panel (on the right on wide screens, at the bottom on phones).
                  Use it to log calls, emails and updates.
                </p>
              </Prose>
              <Steps>
                <Step>Type the note in the box.</Step>
                <Step>
                  To get a reminder, pick a date in <UI>Follow-up date</UI>.
                </Step>
                <Step>Type <UI>Your name</UI>.</Step>
                <Step>Click <Btn>Add note</Btn>.</Step>
              </Steps>
              <Callout tone="info" title="How follow-ups reach the Dashboard">
                <p>
                  The Dashboard reads only the <UI>Follow-up date</UI> field.
                  There is no special wording to type in the note itself. Any
                  note with a Follow-up date appears in the Dashboard’s{" "}
                  <UI>Follow-ups</UI> panel: under <UI>⚠ Overdue</UI> once the
                  date has passed, or under <UI>Upcoming</UI> (the next 8).
                </p>
                <p>
                  Notes can’t be edited, and there is no “done” button. A
                  follow-up stays on the Dashboard until its note is deleted.
                </p>
              </Callout>
              <ToConfirm>
                <p>
                  How the team should close a follow-up once it’s done
                  (deleting the note also deletes its history).
                </p>
              </ToConfirm>
            </SubSection>

            <SubSection id="dashboard" title="Read the Dashboard">
              <Prose>
                <p>
                  Every number on the{" "}
                  <Link href="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>{" "}
                  comes from learner fields. If a number looks wrong, the fields
                  behind it are usually blank.
                </p>
              </Prose>
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <dl className="divide-y divide-gray-100">
                  {[
                    ["Total learners", "Every learner record.", "—"],
                    ["Active", "Learners set to ACTIVE.", "Learner Status"],
                    ["Pending", "Learners set to PENDING.", "Learner Status"],
                    ["Completed / Graduated", "Learners at COMPLETED or GRADUATED.", "Assessment Stage"],
                    ["Window overdue", "In-progress learners 12 months or more past their offer letter.", "Offer Letter Issued Date, Assessment Stage"],
                    ["Unpaid registration", "Learners set to UNPAID. Blank isn’t counted.", "Registration Payment Status"],
                    ["Pipeline by Assessment Stage", "How many learners are at each stage. Learners with a blank stage aren’t shown.", "Assessment Stage"],
                    ["12-Month Window Health", "In-progress learners split into On track (under 9 months), Nearing limit (9–12 mo), Overdue (12 months or more) and No offer letter (date blank). See how the 12-month window works.", "Offer Letter Issued Date, Assessment Stage"],
                    ["Pass / Fail", "Each learner’s most recent module result: the last of PORTFOLIO, FVV, CHALLENGE TEST, CAPSTONE that has a Status. Counts all learners.", "Results by assessment instrument"],
                    ["Lead Ageing", `In-progress learners grouped by how long they’d been in the tracker at their last update: ${AGE_BUCKETS.map((b) => b.label).join(", ")}. Also shows the median and the 5 oldest leads, with how long ago each was last updated. Any change to the learner, or a new or changed note, assignment or document, counts as an update. Saving without changing anything doesn’t.`, "Record created date and last update"],
                    ["Learner Status", "How many learners have each status.", "Learner Status"],
                    ["Sponsor", "How many learners have each sponsor.", "Sponsor"],
                    ["Advisor Load", "How many learners each advisor has. Counts every learner, including completed and withdrawn.", "Advisor (in Assessor Details) — not assignments"],
                    ["Follow-ups", "Overdue follow-ups, then the next 8 upcoming.", "Follow-up date on notes"],
                  ].map(([panel, what, fields]) => (
                    <div key={panel} className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[11rem_minmax(0,1fr)_minmax(0,12rem)] sm:gap-4">
                      <dt className="text-sm font-semibold text-gray-900">{panel}</dt>
                      <dd className="text-sm leading-6 text-gray-700">{what}</dd>
                      <dd className="text-xs text-gray-500 sm:text-right">
                        <span className="sm:hidden">Driven by: </span>
                        {fields}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
              <p className="text-xs text-gray-500">
                “In-progress” means any learner whose Assessment Stage is not
                COMPLETED or GRADUATED — including blank stages and withdrawn
                learners.
              </p>
            </SubSection>

            <SubSection id="reports" title="Reports and Export to Excel">
              <h4 className="text-sm font-semibold text-gray-900">Reports page</h4>
              <Steps>
                <Step>
                  Go to <Link href="/reports" className="text-blue-600 hover:underline">Reports</Link>.
                </Step>
                <Step>
                  Tick the learner fields you want. Fields marked ★ are
                  recommended and ticked to start with. Use{" "}
                  <Btn>Select all</Btn>, <Btn>Clear all</Btn> or{" "}
                  <Btn>Recommended</Btn> to change many at once.
                </Step>
                <Step>
                  Click <Btn>Download Excel report</Btn>.
                </Step>
              </Steps>
              <Prose>
                <p>
                  The file has a <UI>Learners</UI> sheet with your chosen
                  fields. It also includes the <UI>Advisors</UI>,{" "}
                  <UI>Internal Assessors</UI>, <UI>External Assessors</UI>,{" "}
                  <UI>Moderators</UI>, <UI>Assignments</UI>, <UI>Documents</UI>{" "}
                  and <UI>Notes</UI> sheets in full.
                </p>
                <p>
                  Column headings in the file use short system names, for
                  example EMAIL 1 or OFFER LETTER ISSUED DATE, not the exact
                  labels on screen.
                </p>
                <p>
                  <UI>AEB Date (historical)</UI> holds AEB dates recorded
                  before that field was removed from the form. It isn’t
                  updated any more.
                </p>
              </Prose>
              <h4 className="pt-2 text-sm font-semibold text-gray-900">Export to Excel (top bar)</h4>
              <Prose>
                <p>
                  <Btn>Export to Excel</Btn> downloads the same workbook in one
                  click, but the <UI>Learners</UI> sheet has every learner
                  column — including older columns the form no longer uses. Use
                  it for a full backup. Use Reports for a tidy file to share.
                </p>
              </Prose>
            </SubSection>
          </GuideSection>

          {/* ------------------------------------------------------------ */}
          <GuideSection id="weekly-checklist" number={5} title="Weekly checklist">
            <Prose>
              <p>
                Once a week, open the{" "}
                <Link href="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>{" "}
                and work through this list. Where the tracker can’t list the
                learners for you, download a report with the fields shown and
                filter it in Excel.
              </p>
            </Prose>
            <Card className="py-2">
              <ul className="divide-y divide-gray-100">
                <CheckItem title="Unpaid registration">
                  <p>
                    Chase anyone who still hasn’t paid. To see who: report with{" "}
                    <UI>Registration Payment Status</UI> and{" "}
                    <UI>Date of Payment</UI>. Also look for blanks — they aren’t
                    counted on the Dashboard.
                  </p>
                </CheckItem>
                <CheckItem title="Window overdue and Nearing limit (9–12 mo)">
                  <p>
                    Check these learners’ progress. In the Learners list, look
                    for red and amber bars in the <UI>12-month window</UI> column.
                  </p>
                </CheckItem>
                <CheckItem title="No offer letter">
                  <p>
                    For each learner whose offer letter has gone out, fill in{" "}
                    <UI>Offer Letter Issued Date</UI>. To see who: report with{" "}
                    <UI>Self-Assessment Status</UI> and{" "}
                    <UI>Offer Letter Issued Date</UI>.
                  </p>
                </CheckItem>
                <CheckItem title="Oldest leads">
                  <p>
                    Open each learner in <UI>Lead Ageing</UI> → <UI>Oldest leads</UI>.
                    Bring the record up to date, or add a note saying what’s
                    happening.
                  </p>
                </CheckItem>
                <CheckItem title="Follow-ups">
                  <p>
                    Deal with everything under <UI>⚠ Overdue</UI> first, then
                    look at <UI>Upcoming</UI>.
                  </p>
                </CheckItem>
                <CheckItem title="Learners with no stage">
                  <p>
                    Add up the Pipeline and compare with <UI>Total learners</UI>.
                    The difference is learners with a blank{" "}
                    <UI>Assessment Stage</UI>. To see who: report with{" "}
                    <UI>Assessment Stage</UI>, then filter for blanks.
                  </p>
                </CheckItem>
                <CheckItem title="Self-Assessment running over 45 days">
                  <p>
                    Find learners in <StageBadge value="SELF ASSESSMENT" /> more
                    than 45 days after their <UI>Advisor Appointment Date</UI>.
                    To see who: report with <UI>Assessment Stage</UI>,{" "}
                    <UI>Self-Assessment Status</UI> and{" "}
                    <UI>Advisor Appointment Date</UI>. The tracker doesn’t
                    calculate this for you.
                  </p>
                </CheckItem>
              </ul>
            </Card>
          </GuideSection>

          {/* ------------------------------------------------------------ */}
          <GuideSection id="common-mistakes" number={6} title="Common mistakes">
            <div className="space-y-3">
              {[
                {
                  mistake: "Assessment Stage left blank",
                  effect: "The learner is missing from the Pipeline, and the Stage filter can’t find them.",
                  fix: "Set the stage as soon as the advisor is assigned, and change it each time a module starts.",
                },
                {
                  mistake: "No Offer Letter Issued Date",
                  effect: "The learner shows under No offer letter, and their 12-month window isn’t tracked.",
                  fix: "Enter the date the day the letter goes out.",
                },
                {
                  mistake: "Assessor recorded in only one of the two places",
                  effect: "Added only through + Add assignment: Assessor Details stays blank, so the Learners list, Advisor Load and Reports don’t show them. Changed only on the assignment: the next learner save overwrites the appointment date.",
                  fix: "Always start in Assessor Details on the learner record and save. Then edit the assignment it creates.",
                },
                {
                  mistake: "Duplicate learners",
                  effect: "Two records for one person split their history and double the counts.",
                  fix: "Search by IC / Passport No before you add anyone.",
                },
                {
                  mistake: "Wrong date format in bulk upload",
                  effect: "The row is skipped with an error. A slash date typed month-first is read day-first: 03/04/2026 becomes 3 April.",
                  fix: "Use YYYY-MM-DD or DD/MM/YYYY.",
                },
                {
                  mistake: "Results filled in too early",
                  effect: "The Pass / Fail chart and reports show results that don’t exist yet.",
                  fix: "“Leave a row blank until that instrument has been assessed.”",
                },
                {
                  mistake: "Bulk upload with “Update the existing learner” and a partial file",
                  effect: "Every field that’s blank or missing in the file is cleared on the matched learners.",
                  fix: "Use “Skip the row (safest)”, or edit the learner record directly.",
                },
                {
                  mistake: "Leaving the page without saving",
                  effect: "Your changes are lost.",
                  fix: "Click Save changes and wait for “Saved”.",
                },
                {
                  mistake: "Saving a learner whose advisor or assessor isn’t on the list",
                  effect: "The dropdown shows — Not assigned —, and saving clears the name.",
                  fix: "Add the person to the list first, then save.",
                },
              ].map((m) => (
                <div key={m.mistake} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-gray-900">{m.mistake}</p>
                  <div className="mt-2 grid grid-cols-1 gap-2 text-sm leading-6 sm:grid-cols-2 sm:gap-4">
                    <p className="text-gray-700">
                      <span className="block text-[11px] font-semibold uppercase tracking-wide text-red-600">What goes wrong</span>
                      {m.effect}
                    </p>
                    <p className="text-gray-700">
                      <span className="block text-[11px] font-semibold uppercase tracking-wide text-green-700">Fix</span>
                      {m.fix}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </GuideSection>

          {/* ------------------------------------------------------------ */}
          <GuideSection id="glossary" number={7} title="Glossary">
            <SubSection id="glossary-terms" title="Terms">
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <dl className="divide-y divide-gray-100">
                  {[
                    ["APEL", "Accreditation of Prior Experiential Learning, under the MQF."],
                    ["APEL Q", "APEL for the award of a qualification (Qualification Award)."],
                    ["MQA", "Malaysian Qualifications Agency. Candidates first register on the MQA website."],
                    ["MQF", "Malaysian Qualifications Framework. The entry requirement is stated as Master (MQF Level 7)."],
                    ["FVV", "Field Validation Visit — the second module."],
                    ["AEB", "APEL Exam Board. The module dates under Milestones & Claims are based on AEB."],
                    ["Senate", "The university Senate. Record its endorsement in Senate Date before setting GRADUATED."],
                    ["EC", "During early screening, the APEL Centre tells the EC whether the candidate can go to briefing, and the candidate gives their documents to their EC. Full name of the role: to confirm."],
                    ["BRS 1", "A 1-week part of Challenge Test and Capstone Course. Meaning: to confirm."],
                    ["12-month window", "The time since the Offer Letter Issued Date, measured against a 12-month limit."],
                    ["Lead age", "How long a learner had been in the tracker at their last update."],
                    ["Assignment", "One person’s appointment to one learner for one stage, with its letter and claim status."],
                    ["Pipeline", "The Dashboard chart of how many learners are at each Assessment Stage."],
                    ["Current Progress Remark / Remark", "Two separate free-text boxes. Current Progress Remark is in Learner Details Information. Remark is in Learner Progress Information (Reports call it Progress Remark)."],
                  ].map(([term, meaning]) => (
                    <div key={term} className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4">
                      <dt className="text-sm font-semibold text-gray-900">{term}</dt>
                      <dd className="text-sm leading-6 text-gray-700">
                        {meaning}
                        {meaning.includes("to confirm") && (
                          <span className="ml-2 inline-flex rounded-full border border-dashed border-amber-400 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                            To confirm
                          </span>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
              <ToConfirm>
                <p>What EC stands for, and whether it’s the person recorded as <UI>Assigned Counsellor</UI>.</p>
                <p>What BRS 1 stands for.</p>
                <p>What each <UI>Current Progress Remark</UI> and <UI>Remark</UI> should hold.</p>
              </ToConfirm>
            </SubSection>

            <SubSection id="glossary-dropdowns" title="Dropdowns and their values">
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <dl className="divide-y divide-gray-100">
                  {[
                    { field: "Learner Status", where: "Learner record → Learner Details Information", values: LEARNER_STATUSES.map((s) => <StatusBadge key={s} value={s} />) },
                    { field: "Sponsor", where: "Learner record → Learner Details Information", values: vals(SPONSORS) },
                    { field: "Assessment Stage", where: "Learner record → Learner Details Information", values: ASSESSMENT_STAGES.map((s) => <StageBadge key={s} value={s} />) },
                    { field: "Nationality", where: "Learner record → Learner Details Information", values: <Entry>A list of countries, Malaysia first</Entry> },
                    { field: "Registration Payment Status", where: "Learner record → Payment Records", values: PAYMENT_STATUSES.map((s) => <PaymentBadge key={s} value={s} />) },
                    { field: "Advisor, Internal Assessor, External Assessor, Moderator", where: "Learner record → Assessor Details", values: <Entry>Names from the Advisors and Assessors &amp; Moderators lists, or — Not assigned —</Entry> },
                    { field: "Self-Assessment Status", where: "Learner record → Learner Progress Information", values: vals(SELF_ASSESSMENT_STATUSES) },
                    { field: "Status (Pass / Fail)", where: "Learner record → Results by assessment instrument", values: RESULT_STATUSES.map((s) => <ResultBadge key={s} value={s} />) },
                    { field: "Stage (assignment)", where: "Assignments", values: ASSIGNMENT_STAGES.map((s) => <StageBadge key={s} value={s} />) },
                    { field: "Appointment Letter Status", where: "Assignments", values: APPOINTMENT_LETTER_STATUSES.map((s) => <AppointmentLetterStatusBadge key={s} value={s} />) },
                    { field: "Payment Mode", where: "Assignments (not moderators)", values: vals(ADVISOR_PAYMENT_MODES) },
                    { field: "Claim Status", where: "Assignments (not moderators)", values: CLAIM_STATUSES.map((s) => <ClaimStatusBadge key={s} value={s} />) },
                    { field: "Category / Document Category", where: "Document uploads", values: vals(DOCUMENT_CATEGORIES) },
                    { field: "If a learner already exists", where: "Bulk upload", values: vals(["Skip the row (safest)", "Update the existing learner"]) },
                  ].map((d) => (
                    <div key={d.field} className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-4">
                      <dt>
                        <p className="text-sm font-semibold text-gray-900">{d.field}</p>
                        <p className="text-xs text-gray-500">{d.where}</p>
                      </dt>
                      <dd className="flex flex-wrap items-center gap-1">{d.values}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <ToConfirm>
                <p>
                  What each <UI>Learner Status</UI> means and when to switch
                  between them — especially <StatusBadge value="INACTIVE" />{" "}
                  versus <StatusBadge value="PENDING" />.
                </p>
                <p>
                  What each <UI>Sponsor</UI> value covers (
                  {SPONSORS.join(", ")}).
                </p>
              </ToConfirm>
            </SubSection>
          </GuideSection>
        </article>
      </div>
    </div>
  );
}
