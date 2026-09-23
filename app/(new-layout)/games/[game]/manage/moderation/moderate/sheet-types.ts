import type {
    AnonymizeRuleWithNames,
    PublicModLogEntry,
} from '../../../../../../../types/moderation.types';
import type {
    RunnerBanState,
    RunnerCombo,
    RunnerSummary,
} from '../runner/[userId]/runner-model';

export interface RunnerSheetData {
    combos: RunnerCombo[];
    banState: RunnerBanState;
    summary: RunnerSummary;
    anonymizeRules: AnonymizeRuleWithNames[];
    modLog: PublicModLogEntry[];
    modLogTotal: number;
}
