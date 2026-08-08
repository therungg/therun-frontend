// Ongoing board quality signal — the post-setup sibling of completeness.ts.
// Pure module: consumed by the console health card and, later, discovery ranking.
import type { BoardCompleteness, SetupStepId } from './completeness';

export type HealthGrade = 'healthy' | 'needs-attention' | 'at-risk';

export interface HealthItem {
    severity: 'blocker' | 'warning' | 'info';
    label: string;
    /** Console pane to deep-link (?pane=…), or null for purely informational lines. */
    pane: string | null;
}

export interface BoardHealth {
    grade: HealthGrade;
    items: HealthItem[];
}

// Board-wide steps point at the category index, not at one arbitrary
// category. `timing` and `rules` used to be per-category panes, so a
// board-wide warning deep-linked to whichever category happened to be
// selected in the sidebar picker — which no longer exists.
// `boards` is deliberately absent: its step status is only ever done/todo, so
// it never reaches this map, and the curation pane it would name does not
// exist yet. An unmapped step degrades to plain text, not a broken link.
const STEP_PANE: Partial<Record<SetupStepId, string>> = {
    details: 'game-details',
    categories: 'categories',
    groups: 'groups',
    'category-setup': 'categories',
    variables: 'categories',
};

// The stale-triage line ("N triage items waiting more than a week") is gone
// with the Needs attention pane it deep-linked into — health is currently
// setup-completeness only.
export function computeBoardHealth(input: {
    completeness: BoardCompleteness;
}): BoardHealth {
    const items: HealthItem[] = [];

    for (const step of input.completeness.steps) {
        if (step.status === 'blocker') {
            items.push({
                severity: 'blocker',
                label: step.summary,
                pane: STEP_PANE[step.step] ?? null,
            });
        } else if (step.status === 'warning') {
            items.push({
                severity: 'warning',
                label: step.summary,
                pane: STEP_PANE[step.step] ?? null,
            });
        }
    }

    const grade: HealthGrade = items.some((i) => i.severity === 'blocker')
        ? 'at-risk'
        : items.some((i) => i.severity === 'warning')
          ? 'needs-attention'
          : 'healthy';

    if (items.length === 0) {
        items.push({ severity: 'info', label: 'All checks pass', pane: null });
    }

    return { grade, items };
}
