# 00 · Grok Bot intake

The opener. A non-engineer reports something in Slack and Grok Bot turns it into a Jira issue that the automations can pick up.

| Setting | Value |
| --- | --- |
| Where | A demo Slack channel such as `#ledgerly-support`. Start a new thread each run; there is nothing to reset. |
| Grok Bot access | This repo, plus the Jira connector on the demo project |

## Message to paste (as Avery from Finance)

```text
@Grok Bot on the Invoices page, clicking "Overdue" doesn't do anything, the list still shows every invoice. Same thing with "Needs review" on Disputes. Is this a bug? If it is, can you file it in Jira for engineering?
```

## What should happen

1. Grok Bot reads the repo and confirms it is a bug: the status pills write `state=` while the pages read `status`.
2. It files a **Bug** on the demo Jira project with steps to reproduce, the cause, and the files involved, and replies with the issue link.
3. You move that issue to **In Progress** to start the automation chain.

If Grok Bot misfires live, file the same issue with `npm run demo:cloud -- file-grok-bot-issue` and continue from step 3. It adds one issue and touches nothing else.
