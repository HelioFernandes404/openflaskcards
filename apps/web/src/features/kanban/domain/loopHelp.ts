export interface LoopHelpStep {
  id: 'explore' | 'promote' | 'implement' | 'review' | 'merge'
  title: string
  actor: 'agent' | 'human'
  description: string
  command?: string
  commandHint?: string
}

export const LOOP_HELP_STEPS: LoopHelpStep[] = [
  {
    id: 'explore',
    title: '1. Explore',
    actor: 'agent',
    description:
      'Open Claude Code in the repository and run the planner. It scans the codebase for real work (test gaps, bugs, tech debt) and files up to 3 backlog cards here — each with a testable done condition.',
    command: '/explore-board',
  },
  {
    id: 'promote',
    title: '2. Promote (you)',
    actor: 'human',
    description:
      'Review the Backlog column on this board. Move the cards you actually want built to To Do. This is the human gate that keeps the loop from feeding itself invented work.',
  },
  {
    id: 'implement',
    title: '3. Implement',
    actor: 'agent',
    description:
      'Run one tick — or let it loop. Each tick pulls the next To Do card, a maker implements it in an isolated worktree and opens a PR, then an independent judge verifies the done condition: pass moves the card to Done, fail returns it to To Do with an "attempt N:" note. After 2 failed attempts the card escalates to you.',
    command: '/check-board',
    commandHint: '/loop 30m /check-board',
  },
  {
    id: 'review',
    title: '4. Review queue',
    actor: 'agent',
    description:
      'Sweeps open PRs waiting for merge: red CI reopens the card, clean rebases are pushed, green unreviewed PRs get a read-only code review. It never merges.',
    command: '/review-board',
  },
  {
    id: 'merge',
    title: '5. Merge (you)',
    actor: 'human',
    description:
      'Merging the PR is always your final gate. No agent in the loop is allowed to merge or approve.',
  },
]

export const LOOP_CARD_TEMPLATE = `Title: <imperative, specific>

## Context
<context: file paths, current vs expected behavior>

## Done condition
\`\`\`bash
<exact commands to verify, e.g. cd apps/api && make test>
\`\`\`
<expected outcome, e.g. new TestX passes>

Assignee: claude_code`
