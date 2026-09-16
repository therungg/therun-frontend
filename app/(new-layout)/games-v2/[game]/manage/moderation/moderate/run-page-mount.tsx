'use client';

import { useRouter } from 'next/navigation';
import type {
    LeaderboardEntry,
    RunDetail,
} from '../../../../../../../types/leaderboards.types';
import type { RunProvenance } from '../../../../../../../types/moderation.types';
import { formatVariableList } from '../../../labels';
import { ModeratePanel } from './moderate-panel';
import styles from './moderate-panel.module.scss';
import type { SheetBoard, SheetContext } from './subject';

/** What only moderators see about where a run came from. Null when there is nothing to show. */
function ProvenanceFacts({ provenance }: { provenance: RunProvenance | null }) {
    if (!provenance) return null;
    const { ingest, moderation } = provenance;
    const lines: { key: string; label: string; value: string }[] = [];
    if (ingest.submittedBy) {
        lines.push({
            key: 'submitted',
            label: 'Submitted by',
            value: ingest.submittedBy.name,
        });
    }
    if (ingest.createdBy) {
        lines.push({
            key: 'created',
            label: 'Added by',
            value: ingest.createdBy.name,
        });
    }
    if (ingest.platform || ingest.emulator) {
        lines.push({
            key: 'platform',
            label: 'Platform',
            value: [ingest.platform, ingest.emulator ? 'emulator' : null]
                .filter(Boolean)
                .join(' · '),
        });
    }
    if (ingest.reason) {
        lines.push({ key: 'reason', label: 'Reason', value: ingest.reason });
    }
    if (ingest.rawVariables && Object.keys(ingest.rawVariables).length > 0) {
        lines.push({
            key: 'raw',
            label: 'Submitted variables',
            value: formatVariableList(ingest.rawVariables),
        });
    }
    for (const r of provenance.reassignments) {
        if (r.undoneAt != null) continue;
        lines.push({
            key: `moved-${r.reassignmentId}`,
            label: 'Moved from',
            value: `${r.from.gameName} / ${r.from.categoryName}`,
        });
    }
    for (const [i, m] of provenance.identity.entries()) {
        lines.push({
            key: `identity-${i}`,
            label: m.fromGuestName ? 'Merged from guest' : 'Identity moved to',
            value: m.fromGuestName ?? m.to?.name ?? 'account',
        });
    }
    if (moderation.modNote) {
        lines.push({
            key: 'note',
            label: 'Mod note',
            value: moderation.modNote,
        });
    }
    if (moderation.ineligibleReason) {
        lines.push({
            key: 'ineligible',
            label: 'Ineligible',
            value: moderation.ineligibleReason,
        });
    }
    if (lines.length === 0) return null;
    return (
        <section className={styles.section}>
            <div className={styles.sectionHead}>
                <span>Origin</span>
            </div>
            <div className={styles.facts}>
                {lines.map((line) => (
                    <span key={line.key}>
                        {line.label} <b>{line.value}</b>
                    </span>
                ))}
            </div>
        </section>
    );
}

export function RunPageMount({
    run,
    context,
    board,
    provenance,
    rank,
}: {
    run: RunDetail;
    /** The run's place on its board; 0 when it is not the runner's entry. */
    rank: number;
    context: SheetContext;
    board: SheetBoard;
    provenance: RunProvenance | null;
}) {
    const router = useRouter();
    const entry: LeaderboardEntry = {
        runId: run.runId,
        rank,
        runnerName: run.runnerName,
        userId: run.userId,
        isGuest: run.isGuest,
        time: run.time,
        realTime: run.realTime,
        gameTime: run.gameTime,
        runDate: run.runDate,
        vodUrl: run.vodUrl,
        verificationStatus: run.verificationStatus,
        variables: run.variables,
        source: 'run',
    };
    return (
        <ModeratePanel
            subject={{ kind: 'run', entry, board }}
            context={context}
            mount="inline"
            onMutated={() => router.refresh()}
            runExtra={<ProvenanceFacts provenance={provenance} />}
        />
    );
}
