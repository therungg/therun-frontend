import { SwitchField } from '../shared/form-kit';
import styles from './archive-card.module.scss';

export interface PlanRow {
    srcId: string;
    name: string;
    status: string;
    skip: boolean | null;
    saving: boolean;
}

export function PlanList({
    title,
    kind,
    rows,
    onSkip,
}: {
    title: string;
    kind: string;
    rows: PlanRow[];
    onSkip: (srcId: string, skip: boolean) => void;
}) {
    if (rows.length === 0) return null;
    return (
        <div className={styles.list}>
            <h3 className={styles.listTitle}>{title}</h3>
            <div className={styles.scroller}>
                <table className={styles.table}>
                    <tbody>
                        {rows.map((row) => (
                            <tr
                                key={row.srcId}
                                className={
                                    row.saving ? styles.saving : undefined
                                }
                            >
                                <td className={styles.name}>{row.name}</td>
                                <td className={styles.status}>{row.status}</td>
                                <td className={styles.skip}>
                                    {row.skip !== null && (
                                        <SwitchField
                                            id={`archive-skip-${kind}-${row.srcId}`}
                                            label="Skip"
                                            checked={row.skip}
                                            onChange={(on) =>
                                                onSkip(row.srcId, on)
                                            }
                                        />
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
