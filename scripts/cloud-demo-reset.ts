import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  JIRA_DEMO_ISSUES,
  JIRA_DEMO_LABEL,
  stagedJiraDemoIssues,
  type JiraDemoIssue,
} from "../runbooks/jira-cloud-demo";

type Report = { completed: string[]; skipped: string[]; remaining: string[] };

const UPSTREAM_REPO = "joatmon08x/ce-field-demos";
const CLOUD_BRANCH_PREFIX = "cursor/";
/** A dedicated demo project holds the catalog plus a handful of live extras. More means the wrong project. */
const MAX_PROJECT_ISSUES = 40;

const args = process.argv.slice(2);
const action = args[0] ?? "status";
const dryRun = args.includes("--dry-run");
const confirmed = args.includes("--confirm");
const forceMain = args.includes("--force-main");
const withGrokBotIssue = args.includes("--with-grok-bot-issue");

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} in .env.local (see .env.example).`);
  return value;
}

const config = {
  jiraBaseUrl: () => requireEnv("JIRA_BASE_URL").replace(/\/+$/, ""),
  jiraProjectKey: () => requireEnv("JIRA_PROJECT_KEY"),
  githubRepo: () => {
    const repo = requireEnv("DEMO_GITHUB_REPO");
    if (repo.toLowerCase() === UPSTREAM_REPO) throw new Error(`Refusing to reset the shared upstream ${UPSTREAM_REPO}. Point DEMO_GITHUB_REPO at your fork.`);
    return repo;
  },
  baselineTag: () => process.env.DEMO_BASELINE_TAG ?? "demo-baseline",
};

async function jira<T>(method: string, path: string, body?: unknown): Promise<T> {
  const auth = Buffer.from(`${requireEnv("JIRA_EMAIL")}:${requireEnv("JIRA_API_TOKEN")}`).toString("base64");
  const response = await fetch(`${config.jiraBaseUrl()}${path}`, {
    method,
    headers: { Authorization: `Basic ${auth}`, Accept: "application/json", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Jira ${method} ${path} returned ${response.status}: ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

type JiraIssue = { key: string; fields: { summary: string; labels: string[]; status: { name: string } } };

async function listProjectIssues(): Promise<JiraIssue[]> {
  const issues: JiraIssue[] = [];
  let nextPageToken: string | undefined;
  do {
    const page = await jira<{ issues: JiraIssue[]; nextPageToken?: string }>("POST", "/rest/api/3/search/jql", {
      jql: `project = "${config.jiraProjectKey()}" ORDER BY created ASC`,
      fields: ["summary", "labels", "status"],
      maxResults: 100,
      nextPageToken,
    });
    issues.push(...page.issues);
    nextPageToken = page.nextPageToken;
  } while (nextPageToken);
  return issues;
}

async function projectIssueTypes() {
  const project = await jira<{ name: string; issueTypes: Array<{ name: string }> }>(
    "GET",
    `/rest/api/2/project/${encodeURIComponent(config.jiraProjectKey())}`,
  );
  return { name: project.name, issueTypes: new Set(project.issueTypes.map((type) => type.name)) };
}

async function createIssue(issue: JiraDemoIssue, issueTypes: Set<string>) {
  const fields: Record<string, unknown> = {
    project: { key: config.jiraProjectKey() },
    summary: issue.summary,
    description: issue.description,
    issuetype: { name: issueTypes.has(issue.issueType) ? issue.issueType : "Task" },
    labels: [JIRA_DEMO_LABEL, `beat-${issue.role}`],
    priority: { name: issue.priority },
  };
  try {
    return await jira<{ key: string }>("POST", "/rest/api/2/issue", { fields });
  } catch (error) {
    if (!String(error).includes("priority")) throw error;
    delete fields.priority;
    return jira<{ key: string }>("POST", "/rest/api/2/issue", { fields });
  }
}

async function wipeAndStageJira(report: Report) {
  const { name, issueTypes } = await projectIssueTypes();
  const existing = await listProjectIssues();
  if (existing.length > MAX_PROJECT_ISSUES) {
    throw new Error(`Jira project ${config.jiraProjectKey()} (${name}) has ${existing.length} issues. Reset only runs on a dedicated demo project.`);
  }

  for (const issue of existing) {
    if (dryRun) {
      report.completed.push(`Would delete ${issue.key}: ${issue.fields.summary} [${issue.fields.status.name}]`);
      continue;
    }
    await jira("DELETE", `/rest/api/2/issue/${issue.key}?deleteSubtasks=true`);
    report.completed.push(`Deleted ${issue.key}: ${issue.fields.summary}`);
  }

  for (const issue of stagedJiraDemoIssues({ withGrokBotIssue })) {
    if (dryRun) {
      report.completed.push(`Would create [${issue.role}] ${issue.summary}`);
      continue;
    }
    const created = await createIssue(issue, issueTypes);
    report.completed.push(`Created ${created.key} [${issue.role}] ${issue.summary}`);
  }
}

function gh(ghArgs: string[]) {
  return execFileSync("gh", ghArgs, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

type PullRequest = { number: number; headRefName: string; url: string };

function openCloudPullRequests(): PullRequest[] {
  const prs = JSON.parse(
    gh(["pr", "list", "--repo", config.githubRepo(), "--state", "open", "--limit", "100", "--json", "number,headRefName,url"]),
  ) as PullRequest[];
  return prs.filter((pr) => pr.headRefName.startsWith(CLOUD_BRANCH_PREFIX));
}

function cloudBranches() {
  return gh(["api", "--paginate", `repos/${config.githubRepo()}/branches`, "-q", ".[].name"])
    .split("\n")
    .filter((name) => name.startsWith(CLOUD_BRANCH_PREFIX));
}

function refSha(ref: string) {
  try {
    return gh(["api", `repos/${config.githubRepo()}/git/ref/${ref}`, "-q", ".object.sha"]);
  } catch {
    return undefined;
  }
}

function resetGitHub(report: Report) {
  const repo = config.githubRepo();

  for (const pr of openCloudPullRequests()) {
    if (dryRun) {
      report.completed.push(`Would close PR #${pr.number} (${pr.headRefName})`);
      continue;
    }
    gh(["pr", "close", String(pr.number), "--repo", repo, "--delete-branch", "--comment", "Closed by demo:cloud-reset."]);
    report.completed.push(`Closed PR #${pr.number} and deleted ${pr.headRefName}`);
  }

  for (const branch of cloudBranches()) {
    if (dryRun) {
      report.completed.push(`Would delete branch ${branch}`);
      continue;
    }
    gh(["api", "-X", "DELETE", `repos/${repo}/git/refs/heads/${branch}`]);
    report.completed.push(`Deleted branch ${branch}`);
  }

  const baseline = refSha(`tags/${config.baselineTag()}`);
  const main = refSha("heads/main");
  if (!baseline) {
    report.remaining.push(`Tag ${config.baselineTag()} is missing on ${repo}. Run: npm run demo:cloud -- baseline`);
  } else if (main === baseline) {
    report.skipped.push(`main already matches ${config.baselineTag()} (${baseline.slice(0, 7)})`);
  } else if (!forceMain) {
    report.remaining.push(
      `main (${main?.slice(0, 7)}) moved off ${config.baselineTag()} (${baseline.slice(0, 7)}), probably a merged demo PR. Rerun with --force-main to put it back.`,
    );
  } else if (dryRun) {
    report.completed.push(`Would force main back to ${config.baselineTag()} (${baseline.slice(0, 7)})`);
  } else {
    gh(["api", "-X", "PATCH", `repos/${repo}/git/refs/heads/main`, "-f", `sha=${baseline}`, "-F", "force=true"]);
    report.completed.push(`Forced main back to ${config.baselineTag()} (${baseline.slice(0, 7)})`);
  }
}

async function status() {
  const expected = stagedJiraDemoIssues({ withGrokBotIssue }).length;
  const issues = await listProjectIssues();
  const notToDo = issues.filter((issue) => issue.fields.status.name.toLowerCase() !== "to do");
  const prs = openCloudPullRequests();
  const baseline = refSha(`tags/${config.baselineTag()}`);
  const main = refSha("heads/main");
  const ready = issues.length === expected && notToDo.length === 0 && prs.length === 0 && !!baseline && main === baseline;
  return {
    ready,
    jira: { project: config.jiraProjectKey(), issues: issues.length, expected, notToDo: notToDo.map((issue) => `${issue.key} [${issue.fields.status.name}]`) },
    github: { repo: config.githubRepo(), openCloudPRs: prs.map((pr) => pr.url), mainMatchesBaseline: !!baseline && main === baseline },
  };
}

function tagBaseline() {
  const repo = config.githubRepo();
  const main = refSha("heads/main");
  if (!main) throw new Error(`No main branch on ${repo}.`);
  const tag = config.baselineTag();
  if (refSha(`tags/${tag}`)) {
    if (!confirmed) throw new Error(`${tag} already exists. Rerun with --confirm to move it to main (${main.slice(0, 7)}).`);
    gh(["api", "-X", "PATCH", `repos/${repo}/git/refs/tags/${tag}`, "-f", `sha=${main}`, "-F", "force=true"]);
  } else {
    gh(["api", "-X", "POST", `repos/${repo}/git/refs`, "-f", `ref=refs/tags/${tag}`, "-f", `sha=${main}`]);
  }
  console.log(`${tag} now points at main (${main.slice(0, 7)}) on ${repo}.`);
}

async function main() {
  if (action === "status") {
    console.log(JSON.stringify(await status(), null, 2));
    return;
  }
  if (action === "baseline") {
    tagBaseline();
    return;
  }
  if (action === "file-grok-bot-issue") {
    const { issueTypes } = await projectIssueTypes();
    for (const issue of JIRA_DEMO_ISSUES.filter((candidate) => candidate.role === "grok-bot")) {
      const created = await createIssue(issue, issueTypes);
      console.log(`Created ${created.key}: ${issue.summary}`);
    }
    return;
  }
  if (action !== "reset" && action !== "stage") throw new Error(`Unknown action: ${action}. Use status, stage, reset, baseline, or file-grok-bot-issue.`);
  if (!dryRun && !confirmed) {
    throw new Error(`${action} deletes every issue in Jira project ${config.jiraProjectKey()}${action === "reset" ? ` and closes cursor/* PRs on ${config.githubRepo()}` : ""}. Preview with --dry-run, then rerun with --confirm.`);
  }

  const report: Report = { completed: [], skipped: [], remaining: [] };
  if (action === "reset") resetGitHub(report);
  await wipeAndStageJira(report);
  console.log(JSON.stringify(report, null, 2));
  if (!dryRun) console.log(JSON.stringify(await status(), null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
