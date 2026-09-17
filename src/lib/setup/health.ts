// Ongoing board quality signal — the post-setup sibling of completeness.ts.
// Pure module: consumed by the console health card and, later, discovery ranking.
import type { BoardCompleteness, SetupStepState } from './completeness';
import { isWorkspaceSub } from './workspace';

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

// Board-wide steps point at a page, never at one arbitrary category. A
// Categories or Levels status carries the screen that fixes it.
function paneFor(step: SetupStepState): string | null {
    if (step.step === 'details') return 'game-details';
    if (step.step === 'categories' || step.step === 'levels') {
        const sub = isWorkspaceSub(step.step, step.sub) ? step.sub : 'list';
        return `${step.step}/${sub}`;
    }
    return null;
}

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
                pane: paneFor(step),
            });
        } else if (step.status === 'warning') {
            items.push({
                severity: 'warning',
                label: step.summary,
                pane: paneFor(step),
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
