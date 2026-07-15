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

export const STALE_TRIAGE_MS = 7 * 24 * 60 * 60 * 1000;

const STEP_PANE: Partial<Record<SetupStepId, string>> = {
    details: 'game-details',
    categories: 'categories-visibility',
    'category-config': 'rules',
    defaults: 'timing',
};

export function computeBoardHealth(input: {
    completeness: BoardCompleteness;
    attentionCreatedAts: string[];
    now: number;
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

    const stale = input.attentionCreatedAts.filter((iso) => {
        const t = new Date(iso).getTime();
        return Number.isFinite(t) && input.now - t > STALE_TRIAGE_MS;
    }).length;
    if (stale > 0) {
        items.push({
            severity: stale > 2 ? 'warning' : 'info',
            label: `${stale} triage item${stale === 1 ? '' : 's'} waiting more than a week`,
            pane: 'attention',
        });
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
