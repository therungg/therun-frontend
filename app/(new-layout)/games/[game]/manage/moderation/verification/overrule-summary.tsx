import type { VerificationSettingsView } from '../../../../../../../types/verification-settings.types';

const CHECK_LABELS: Record<string, string> = {
    consistency: 'splits consistency',
    'live-match': 'live timing',
    'gold-beat': 'gold beat',
    'pb-jump': 'PB improvement',
    'prior-runs': 'verified runs needed first',
    'top-n': 'never auto-verify the top',
};

const REASON_LABELS: Record<string, string> = {
    no_video: 'no video',
    wrong_category: 'wrong category',
    timing_rule: 'timing rules',
    splits_inconsistent: 'splits did not match',
    duplicate: 'duplicate',
    other: 'other',
};

const plural = (n: number, one: string, many: string) =>
    `${n} ${n === 1 ? one : many}`;

/**
 * How often moderators have disagreed with the dials, shown where the dials are
 * set. The two directions mean opposite things, so they are never summed.
 */
export function OverruleSummary({
    overrules,
}: {
    overrules: VerificationSettingsView['overrules'];
}) {
    const { rejectedAPass, verifiedAFail, tooStrict, tooLenient } = overrules;
    if (rejectedAPass === 0 && verifiedAFail === 0) return null;

    return (
        <div className="alert alert-secondary py-2 px-3 mb-3">
            <div className="fw-semibold mb-1">
                Where you have disagreed with these settings
            </div>
            {verifiedAFail > 0 && (
                <div>
                    You verified {plural(verifiedAFail, 'run', 'runs')} these
                    settings had stopped
                    {tooStrict.length > 0 && (
                        <>
                            {', most often '}
                            {tooStrict
                                .slice(0, 2)
                                .map(
                                    (s) =>
                                        `${CHECK_LABELS[s.check] ?? s.check} (${s.n})`,
                                )
                                .join(', ')}
                        </>
                    )}
                    . Those dials may be too strict.
                </div>
            )}
            {rejectedAPass > 0 && (
                <div>
                    You rejected {plural(rejectedAPass, 'run', 'runs')} these
                    settings had cleared
                    {tooLenient.length > 0 && (
                        <>
                            {', most often for '}
                            {tooLenient
                                .slice(0, 2)
                                .map(
                                    (r) =>
                                        `${REASON_LABELS[r.reason] ?? r.reason} (${r.n})`,
                                )
                                .join(', ')}
                        </>
                    )}
                    . Something here may be too lenient.
                </div>
            )}
        </div>
    );
}
