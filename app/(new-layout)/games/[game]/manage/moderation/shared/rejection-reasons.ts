import type { RejectionReasonKey } from '../../../../../../../types/moderation.types';

/** Mirror of the backend's REJECTION_REASON_LABELS. The label is what the runner reads. */
export const REJECTION_REASONS: { key: RejectionReasonKey; label: string }[] = [
    { key: 'no_video', label: 'No video was provided' },
    {
        key: 'wrong_category',
        label: 'Submitted to the wrong category or subcategory',
    },
    { key: 'timing_rule', label: "Timing does not follow the board's rules" },
    {
        key: 'splits_inconsistent',
        label: 'Splits do not match the submitted time',
    },
    { key: 'duplicate', label: 'Duplicate of an existing run' },
    { key: 'other', label: 'Other' },
];
