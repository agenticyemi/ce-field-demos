# 02 · Build

| Setting | Value |
| --- | --- |
| Trigger | Webhook. A Jira Automation rule on the demo project: **Comment added**, condition **comment contains `[ledgerly-plan]`** ? **Send web request** to this automation's webhook URL with the issue key. |
| Repo | Your fork of `ce-field-demos`, `main` |
| Model | A fast, lighter model. The plan is already written; this step follows it. |
| Tools | Jira MCP (read issue, comment, transition); open pull requests |
| Memory | On |

## Prompt

```text
You implement one Ledgerly Jira issue from the plan another agent already wrote.

1. Validate. Continue only if the issue is In Progress, does not have the label needs-human-review, and has a comment ending in [ledgerly-plan]. Otherwise stop and say why.

2. Read the newest [ledgerly-plan] comment and AGENTS.md. Follow the plan. Do not widen the scope. If the plan is wrong, comment why on the issue and stop.

3. Work on a branch named cursor/<ISSUE-KEY>-<short-slug>.

4. Run npm test. A clean tree is 1 failed / 33 passed, and tests/suggested-credit-api.test.ts is the expected failure unless this issue is the suggested-credit migration. Never edit a test or prisma/seed.ts to make the suite pass.

5. Open a pull request:
   - Title: <ISSUE-KEY>: <issue summary>
   - Body: link to the issue, what changed and why, the npm test result, and how to verify in the app.

6. Comment the pull request URL on the issue. Move the issue to In Review if that status exists; otherwise leave it In Progress.

Keep catalog prices at Starter $49, Growth $99, Scale $249.
```
