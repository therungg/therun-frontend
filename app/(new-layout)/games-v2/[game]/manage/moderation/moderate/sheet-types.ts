import type {
    AnonymizeRuleWithNames,
    HistoryEvent,
    PublicModLogEntry,
} from '../../../../../../../types/moderation.types';
import type {
    RunnerBanState,
    RunnerCombo,
    RunnerSummary,
} from '../runner/[userId]/runner-model';

export interface OffSegment {
    name: string;
    /** Segment duration minus the median segment duration of the run, ms. Positive = slow. */
    deltaMs: number;
}

export interface RunSheetSummary {
    status: 'pending' | 'verified' | 'rejected';
    /** Newest direct exclude/include event says removed. Ban rules do not count. */
    excluded: boolean;
    /** Newest mark/unmark event says marked. */
    marked: boolean;
    splitCount: number;
    finalTimeMs: number | null;
    /** 'unknown' when the run has no splits. */
    consistency: 'consistent' | 'off' | 'unknown';
    offSegments: OffSegment[];
    vodUrls: string[];
    description: string | null;
    historyCount: number;
    /** Last five events, newest first. */
    history: HistoryEvent[];
}

export interface RunnerSheetData {
    runnerName: string;
    combos: RunnerCombo[];
    banState: RunnerBanState;
    summary: RunnerSummary;
    anonymizeRules: AnonymizeRuleWithNames[];
    modLog: PublicModLogEntry[];
    modLogTotal: number;
}
