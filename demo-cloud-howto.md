# Cloud Agents + Automations + Grok Bot demo

About 20 minutes. A finance user reports a bug in Slack, Grok Bot files it in Jira, and a chain of Cursor Automations triages it, gates the risky work, opens PRs in parallel, and reviews them alongside Bugbot. One command puts everything back for the next customer.

Automation prompts live in `automations/`. The ticket catalog is `runbooks/jira-cloud-demo.ts`. Reset is `scripts/cloud-demo-reset.ts`.

## One-time setup

1. **Fork.** Fork `joatmon08x/ce-field-demos` to your GitHub. Make sure the Cursor GitHub app can see the fork, then create a Cloud Agent environment for it.
2. **Jira.** Create a project used only for this demo (key `LED` works). Reset deletes every issue in it. Add an **In Review** status if your workflow has none.
3. **`.env.local`.** Copy the Cloud demo block from `.env.example` and fill it in. Create the API token at id.atlassian.com ? Security ? API tokens.
4. **Automations.** Create the three in the Cursor dashboard from `automations/01-*.md` to `03-*.md`. Each file has the trigger, model, tools, and prompt.
5. **Jira rules.** In the demo project, create two Jira Automation rules that send a web request to the matching Cursor automation webhook:
   - Issue transitioned to **In Progress** ? `01 Assess and triage`
   - Comment added, containing `[ledgerly-plan]` ? `02 Build`
6. **Bugbot.** Turn it on for the fork.
7. **Grok Bot.** Give it the fork and the Jira connector, and invite it to a demo Slack channel. See `automations/00-grok-bot-intake.md`.
8. **Baseline.** `npm run demo:cloud -- baseline` tags the fork's `main` as `demo-baseline`. Rerun with `--confirm` whenever you intentionally change `main`.
9. **Stage.** `npm run demo:cloud -- stage --confirm`, then `npm run demo:cloud` should report `"ready": true`.

## Before each customer

1. `npm run demo:cloud`: `"ready": true` means the board has the expected issues, all in To Do; there are no open `cursor/*` PRs; and `main` matches `demo-baseline`.
2. Open the tabs: Slack channel, Jira board, Cursor Automations, Cursor agents dashboard, the fork's pull requests, and Ledgerly locally (`npm run dev`, http://127.0.0.1:43173/invoices).
3. Swap the customer's tracker or chat tool into your words, not the setup. "This is Jira; the same trigger works from Linear, PagerDuty, or GitHub."

## Run of show

| Time | Beat | Do | Say |
| --- | --- | --- | --- |
| 0:00 | Frame | Jira board | "Most teams start with one tightly scoped automation, earn trust in it, then chain the next one." |
| 0:01 | Grok Bot | Paste the message from `00-grok-bot-intake.md` in Slack | "Avery isn't an engineer. She asks in Slack; Grok Bot checks the code and files the ticket." |
| 0:04 | Start the chain | Move the new filter bug to **In Progress**. Open `01 Assess and triage` while it runs. | Walk the trigger, the scoring rubric, the gate, the model choice, the Jira MCP permissions, and memory. |
| 0:07 | The gate | Move **Dollar amounts stay masked outside Starter, Growth, and Scale** to In Progress | "This one touches what customers see they owe. Watch it come back to a human." It returns to To Do with `needs-human-review`. |
| 0:09 | Burndown | Move **Invoice detail has no control to change customer email** and **Customers account shows its overdue book** to In Progress together | "Backlog burndown: each ticket gets its own cloud agent and its own branch." Show them in the agents dashboard. |
| 0:11 | Local to cloud | In Cursor, Plan mode: "Plan a fix for the Jira issue *Suggested credit on dsp_1043 shows $400 instead of the $249 Scale cap*." Then **Build in cloud**. | "Explore locally; when it's time for the long run, hand it to the cloud and close your laptop." |
| 0:15 | Review | Open the filter bug's PR. Show the `03 Review` automation's review and Bugbot's findings. | "Two layers: your team's rules, and Bugbot." |
| 0:19 | Close | Jira board | "Which of your backlogs would you start with?" |

Cloud agents take a few minutes per step. Talk through the automation config while they run. If a step is slow, open that automation's run history: it keeps earlier runs even after a reset.

## Between customers

```bash
npm run demo:cloud -- reset --dry-run   # preview
npm run demo:cloud-reset                # close cursor/* PRs, delete their branches, wipe and restage Jira
npm run demo:reset                      # only if you changed the local tree during the local-to-cloud beat
```

If a demo PR was merged, reset reports that `main` moved off `demo-baseline`. Put it back with `npm run demo:cloud -- reset --confirm --force-main`.

Reset does not touch the Cursor automations, Slack threads, or automation memories. If an automation learned something odd from a run, clear its memory in the dashboard.
