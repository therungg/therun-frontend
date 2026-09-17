import { formatBoardDate } from '~src/lib/format-run-date';
import type { HistoryEvent } from '../../../../../types/moderation.types';
import { OriginPanel } from './origin-panel';
import { AutoVerifyBreakdown } from './run-badges';
import { RunHistoryList } from './run-history-list';
import styles from './run-page.module.scss';
import type { RunViewModel } from './run-view';

const INLINE_HISTORY = 3;

function VerificationLine({ model }: { model: RunViewModel }) {
    if (model.verificationStatus === 'pending') {
        return <span>Awaiting verification</span>;
    }
    if (model.verificationStatus !== 'verified') return null;
    const date = model.verifiedAt ? formatBoardDate(model.verifiedAt) : '';
    return (
        <span>
            Verified{date && ` ${date}`}
            {model.verifiedBy && ` by ${model.verifiedBy.name}`}
        </span>
    );
}

export function VerificationFooter({
    model,
    history,
    isMod,
}: {
    model: RunViewModel;
    history: HistoryEvent[];
    isMod: boolean;
}) {
    const events = [...history].sort(
        (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    );
    const latest = events.slice(0, INLINE_HISTORY);
    const rest = events.slice(INLINE_HISTORY);

    return (
        <footer className={styles.footer}>
            <div className={styles.footerLine}>
                <VerificationLine model={model} />
                <OriginPanel model={model} />
            </div>
            {latest.length > 0 && <RunHistoryList events={latest} />}
            {rest.length > 0 && (
                <details className={styles.history}>
                    <summary>Show all ({events.length})</summary>
                    <RunHistoryList events={rest} />
                </details>
            )}
            {isMod && model.autoVerifyResult && (
                <AutoVerifyBreakdown result={model.autoVerifyResult} />
            )}
        </footer>
    );
}
