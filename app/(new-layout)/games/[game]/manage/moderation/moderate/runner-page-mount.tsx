'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { BackLink } from '../../../shared/back-link';
import { ModeratePanel } from './moderate-panel';
import type { SheetContext } from './subject';
import type { ModerateVerb } from './verbs';

export function RunnerPageMount({
    userId,
    runnerName,
    context,
    categoryId,
    initialVerb,
    backHref,
    backLabel,
    srcIdentity,
}: {
    userId: number;
    runnerName: string;
    context: SheetContext;
    categoryId: number | null;
    /** Opened with this verb's form, e.g. from the run view's Actions. */
    initialVerb?: ModerateVerb;
    backHref: string;
    backLabel: string;
    srcIdentity: ReactNode;
}) {
    const router = useRouter();
    return (
        <div className="d-flex flex-column gap-3">
            <div>
                <BackLink href={backHref} label={backLabel} />
            </div>
            <ModeratePanel
                subject={{ kind: 'runner', userId, runnerName, categoryId }}
                context={context}
                mount="inline"
                initialVerb={initialVerb}
                onMutated={() => router.refresh()}
            />
            {srcIdentity}
        </div>
    );
}
