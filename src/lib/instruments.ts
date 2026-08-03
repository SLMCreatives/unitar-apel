// Helpers for the per-instrument results on a learner. The columns are flat
// (portfolio_gpa, fvv_result_status, …) so reports, exports and the bulk
// importer pick them up like any other learner field; these functions are the
// convenient way to read them back as a list.

import {
  ASSESSMENT_INSTRUMENTS,
  type ResultStatus,
  type AssessmentInstrument,
} from "@/lib/types";

export type InstrumentResult = {
  level: AssessmentInstrument["level"];
  prefix: AssessmentInstrument["prefix"];
  resultStatus: ResultStatus | null;
  gpa: number | null;
  cgpa: number | null;
};

// The three column names an instrument's results live in.
export function instrumentColumns(prefix: string) {
  return {
    resultStatus: `${prefix}_result_status`,
    gpa: `${prefix}_gpa`,
    cgpa: `${prefix}_cgpa`,
  } as const;
}

type LearnerLike = Record<string, unknown>;

export function instrumentResults(learner: LearnerLike | null | undefined): InstrumentResult[] {
  return ASSESSMENT_INSTRUMENTS.map(({ level, prefix }) => {
    const cols = instrumentColumns(prefix);
    const gpa = learner?.[cols.gpa];
    const cgpa = learner?.[cols.cgpa];
    return {
      level,
      prefix,
      resultStatus: (learner?.[cols.resultStatus] as ResultStatus | null) ?? null,
      gpa: typeof gpa === "number" ? gpa : gpa === null || gpa === undefined ? null : Number(gpa),
      cgpa: typeof cgpa === "number" ? cgpa : cgpa === null || cgpa === undefined ? null : Number(cgpa),
    };
  });
}

// A learner's headline pass/fail: the result of the furthest instrument they
// have been graded on. Used where a single status is still meaningful, such
// as the dashboard's pass/fail split.
export function latestInstrumentResult(
  learner: LearnerLike | null | undefined
): ResultStatus | null {
  const graded = instrumentResults(learner).filter((r) => r.resultStatus !== null);
  return graded.length > 0 ? graded[graded.length - 1].resultStatus : null;
}
