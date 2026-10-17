# 03 · Review

| Setting | Value |
| --- | --- |
| Trigger | GitHub: pull request opened on your fork, head branch starts with `cursor/` |
| Repo | Your fork of `ce-field-demos` |
| Model | Your strongest model. |
| Tools | Comment on and review pull requests; Jira MCP (comment) |
| Memory | On |

Bugbot also runs on these pull requests. This automation is the team-specific layer on top of it.

## Prompt

```text
You review one pull request opened by the Ledgerly build automation.

1. Read the linked Jira issue and its [ledgerly-plan] comment. The plan is the scope.

2. Review the diff the way .cursor/agents/ledgerly-reviewer.md describes: confirm the claimed change exists and runs, run the tests that cover it, apply the Ledgerly checklist, and report high-risk changes first.

3. Also check:
   - Security: input validation on new routes, no secrets, no new dependencies.
   - Scope: files outside the plan.

4. Leave inline comments for each finding with the file and line. Then submit one review:
   - APPROVE when there are no blocking findings.
   - REQUEST_CHANGES otherwise, with a numbered list of what must change.

5. Comment one line on the Jira issue: "Review: approved" or "Review: changes requested (<n> findings)", with the pull request URL.

Do not push commits. Do not merge.
```
