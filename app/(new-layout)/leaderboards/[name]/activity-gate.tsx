'use client';

import type { ReactNode } from 'react';
import { useShowcase } from './showcase-provider';

/** The heatmap card follows the runner's switch, live while editing. */
export function ActivityGate({ children }: { children: ReactNode }) {
    const { draft } = useShowcase();
    return draft.showActivity ? <>{children}</> : null;
}
