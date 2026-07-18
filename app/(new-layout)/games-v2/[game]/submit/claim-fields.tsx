import type { ModTiming } from '../../../../../types/moderation.types';
import { type TimeField, TimeInput } from './time-input';

const TIMING_EXPLAINER =
    'Real time (RTA) — wall-clock time. Game time (IGT) — the in-game timer.';

interface Props {
    claimTimingChoice: boolean;
    claimTiming: ModTiming;
    onClaimTimingChange: (timing: ModTiming) => void;
    effectiveClaimTiming: ModTiming;
    claimTime: TimeField;
    onChangeClaimTime: (raw: string) => void;
    evidenceUrl: string;
    evidenceShowInvalid: boolean;
    onEvidenceChange: (value: string) => void;
    onEvidenceBlur: () => void;
}

/** The claim-only fields: timing choice, asserted time, evidence URL. */
export function ClaimFields({
    claimTimingChoice,
    claimTiming,
    onClaimTimingChange,
    effectiveClaimTiming,
    claimTime,
    onChangeClaimTime,
    evidenceUrl,
    evidenceShowInvalid,
    onEvidenceChange,
    onEvidenceBlur,
}: Props) {
    return (
        <>
            {claimTimingChoice && (
                <div>
                    <label htmlFor="claim-timing" className="form-label">
                        Timing
                    </label>
                    <select
                        id="claim-timing"
                        className="form-select"
                        value={claimTiming}
                        onChange={(e) =>
                            onClaimTimingChange(e.target.value as ModTiming)
                        }
                    >
                        <option value="realtime">Real time (RTA)</option>
                        <option value="gametime">Game time (IGT)</option>
                    </select>
                    <div className="form-text">{TIMING_EXPLAINER}</div>
                </div>
            )}

            <TimeInput
                id="claim-time"
                label={
                    effectiveClaimTiming === 'realtime'
                        ? 'Real time (RTA)'
                        : 'Game time (IGT)'
                }
                required
                field={claimTime}
                onChange={onChangeClaimTime}
            />

            <div>
                <label htmlFor="claim-evidence" className="form-label">
                    Evidence URL
                    <span className="text-muted small"> (optional)</span>
                </label>
                <input
                    id="claim-evidence"
                    type="url"
                    className={`form-control ${evidenceShowInvalid ? 'is-invalid' : ''}`}
                    value={evidenceUrl}
                    onChange={(e) => onEvidenceChange(e.target.value)}
                    onBlur={onEvidenceBlur}
                    placeholder="https://... (VOD or proof, if you have it)"
                />
                {evidenceShowInvalid && (
                    <div className="invalid-feedback">
                        Enter a valid http(s) URL.
                    </div>
                )}
                <div className="form-text">
                    No video needed — a faster legitimate run replaces this
                    automatically. A time that beats your current standing is
                    reviewed by a moderator first.
                </div>
            </div>
        </>
    );
}
