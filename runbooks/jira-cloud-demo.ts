/** Jira board for the Cloud Agents + Automations + Grok Bot demo. Copy comes from the Linear catalog. */

import {
  COLLECTIONS_COMMAND_CENTER_ISSUES,
  FIELD_DEMO_ISSUES,
  collectionsCommandCenterDescription,
} from "./linear-field-demos";

/**
 * - `grok-bot`: not staged by default; Grok Bot files it live from Slack.
 * - `plan-then-cloud`: planned in a local agent, then sent with Build in cloud.
 * - `gate`: Assess must send it back with `needs-human-review`.
 * - `burndown`: moved to In Progress together to show parallel cloud agents.
 * - `backlog`: realistic board filler.
 */
export type JiraDemoRole = "grok-bot" | "plan-then-cloud" | "gate" | "burndown" | "backlog";

export type JiraDemoIssue = {
  slug: string;
  role: JiraDemoRole;
  issueType: "Bug" | "Story";
  priority: "High" | "Medium";
  summary: string;
  description: string;
};

export const JIRA_DEMO_LABEL = "ledgerly-demo";
export const JIRA_HUMAN_REVIEW_LABEL = "needs-human-review";
export const JIRA_PLAN_MARKER = "[ledgerly-plan]";

const FIELD_ROLES: Record<(typeof FIELD_DEMO_ISSUES)[number]["slug"], JiraDemoRole> = {
  "filter-pills": "grok-bot",
  "suggested-credit-v1": "plan-then-cloud",
  "email-on-invoice": "burndown",
};

const SLICE_ROLES: Partial<Record<(typeof COLLECTIONS_COMMAND_CENTER_ISSUES)[number]["slug"], JiraDemoRole>> = {
  "overdue-book": "burndown",
  "amount-mask": "gate",
};

export const JIRA_DEMO_ISSUES: readonly JiraDemoIssue[] = [
  ...FIELD_DEMO_ISSUES.map((issue) => ({
    slug: issue.slug,
    role: FIELD_ROLES[issue.slug],
    issueType: issue.type,
    priority: issue.priority === 2 ? ("High" as const) : ("Medium" as const),
    summary: issue.title,
    description: issue.description,
  })),
  ...COLLECTIONS_COMMAND_CENTER_ISSUES.map((issue) => ({
    slug: issue.slug,
    role: SLICE_ROLES[issue.slug] ?? ("backlog" as const),
    issueType: "Story" as const,
    priority: "Medium" as const,
    summary: issue.title,
    description: collectionsCommandCenterDescription(issue),
  })),
];

/** Issues staged on a reset. `withGrokBotIssue` is the fallback when Grok Bot can't file live. */
export function stagedJiraDemoIssues(options: { withGrokBotIssue?: boolean } = {}) {
  return JIRA_DEMO_ISSUES.filter((issue) => options.withGrokBotIssue || issue.role !== "grok-bot");
}
