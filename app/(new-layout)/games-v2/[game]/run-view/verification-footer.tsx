import moment from 'moment';
import type { HistoryEvent } from '../../../../../types/moderation.types';
import { OriginPanel } from './origin-panel';
import { AutoVerifyBreakdown } from './run-badges';
import { RunHistoryList } from './run-history-list';
import styles from './run-page.module.scss';
import type { RunViewModel } from './run-view';

export function VerificationFooter({
    model,
    history,
    isMod,
}: {
    model: RunViewModel;
    history: HistoryEvent[];
    isMod: boolean;
}) {
    return (
        <footer className={styles.footer}>
            <div className={styles.footerLine}>
                {model.verifiedBy && (
                    <span>
                        Verified by {model.verifiedBy.name}
                        {model.verifiedAt &&
                            ` · ${moment(model.verifiedAt).format('D MMM YYYY')}`}
                    </span>
                )}
                <OriginPanel model={model} />
            </div>
            {history.length > 0 && (
                <details className={styles.history}>
                    <summary>History ({history.length})</summary>
                    <RunHistoryList events={history} />
                </details>
            )}
            {isMod && model.autoVerifyResult && (
                <AutoVerifyBreakdown result={model.autoVerifyResult} />
            )}
        </footer>
    );
}
