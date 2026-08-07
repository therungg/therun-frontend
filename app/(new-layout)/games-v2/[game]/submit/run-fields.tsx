import type {
    GameTimeLabel,
    VariableRow,
} from '../../../../../types/leaderboards.types';
import { type TimeField, TimeInput } from './time-input';

function timingExplainer(gameTimeLabel: GameTimeLabel): string {
    return gameTimeLabel === 'lrt'
        ? 'Real time (RTA) — wall-clock time. Load-removed time (LRT) — the timer with loads removed.'
        : 'Real time (RTA) — wall-clock time. Game time (IGT) — the in-game timer.';
}

function gameTimeFieldLabel(gameTimeLabel: GameTimeLabel): string {
    return gameTimeLabel === 'lrt'
        ? 'Load-removed time (LRT)'
        : 'Game time (IGT)';
}

interface Props {
    /** What the selected category calls its game-time clock. */
    gameTimeLabel?: GameTimeLabel;
    // Optional variables — submit-mode only.
    filterDefs: VariableRow[];
    filters: Record<string, string>;
    onFilterChange: (nameNormalized: string, value: string) => void;

    // Time fields.
    showRt: boolean;
    showGt: boolean;
    primaryIsRt: boolean;
    rt: TimeField;
    gt: TimeField;
    onChangeRt: (raw: string) => void;
    onChangeGt: (raw: string) => void;

    // Date achieved.
    runDate: string;
    today: string;
    onChangeRunDate: (date: string) => void;

    // Video URL.
    vodUrl: string;
    vodRequired: boolean;
    vodInvalid: boolean;
    vodMissing: boolean;
    vodShowInvalid: boolean;
    onVodChange: (value: string) => void;
    onVodBlur: () => void;
}

/** The run-submission-only fields: optional variables, RT/GT, date, video URL. */
export function RunFields({
    gameTimeLabel = 'igt',
    filterDefs,
    filters,
    onFilterChange,
    showRt,
    showGt,
    primaryIsRt,
    rt,
    gt,
    onChangeRt,
    onChangeGt,
    runDate,
    today,
    onChangeRunDate,
    vodUrl,
    vodRequired,
    vodInvalid,
    vodMissing,
    vodShowInvalid,
    onVodChange,
    onVodBlur,
}: Props) {
    return (
        <>
            {filterDefs.map((def) => (
                <div key={def.nameNormalized}>
                    <label
                        htmlFor={`filter-${def.nameNormalized}`}
                        className="form-label"
                    >
                        {def.name}{' '}
                        <span className="text-muted small">(optional)</span>
                    </label>
                    <select
                        id={`filter-${def.nameNormalized}`}
                        className="form-select"
                        value={filters[def.nameNormalized] ?? ''}
                        onChange={(e) =>
                            onFilterChange(def.nameNormalized, e.target.value)
                        }
                    >
                        <option value="">—</option>
                        {def.values.map((bucket, idx) => (
                            <option
                                key={`${def.nameNormalized}-${idx}`}
                                value={bucket[0]}
                            >
                                {bucket[0]}
                            </option>
                        ))}
                    </select>
                </div>
            ))}

            {showRt && (
                <TimeInput
                    id="submit-rt"
                    label="Real time (RTA)"
                    required={primaryIsRt}
                    field={rt}
                    onChange={onChangeRt}
                />
            )}
            {showGt && (
                <TimeInput
                    id="submit-gt"
                    label={gameTimeFieldLabel(gameTimeLabel)}
                    required={!primaryIsRt}
                    field={gt}
                    onChange={onChangeGt}
                />
            )}
            {showRt && showGt && (
                <div className="form-text">
                    {timingExplainer(gameTimeLabel)}
                </div>
            )}

            <div>
                <label htmlFor="submit-date" className="form-label">
                    Date achieved
                </label>
                <input
                    id="submit-date"
                    type="date"
                    className="form-control"
                    value={runDate}
                    max={today}
                    onChange={(e) => onChangeRunDate(e.target.value)}
                    required
                />
            </div>

            <div>
                <label htmlFor="submit-vod" className="form-label">
                    Video URL
                    <span className="text-muted small">
                        {' '}
                        {vodRequired ? '(required)' : '(optional)'}
                    </span>
                </label>
                <input
                    id="submit-vod"
                    type="url"
                    className={`form-control ${vodShowInvalid ? 'is-invalid' : ''}`}
                    value={vodUrl}
                    onChange={(e) => onVodChange(e.target.value)}
                    onBlur={onVodBlur}
                    placeholder="https://..."
                    required={vodRequired}
                />
                {vodShowInvalid &&
                    (vodInvalid ? (
                        <div className="invalid-feedback">
                            Enter a valid http(s) URL.
                        </div>
                    ) : vodMissing ? (
                        <div className="invalid-feedback">
                            Video URL is required for this category.
                        </div>
                    ) : null)}
                {vodRequired && (
                    <div className="form-text">
                        This category requires video for verification.
                    </div>
                )}
            </div>
        </>
    );
}
