import { entrySubcategoryLabels, type SubcategoryNamed } from './format';
import styles from './subcategory-tags.module.scss';

/**
 * The subcategory an entry sits on, one tag per value. They were a run of grey
 * text that read like the "of 1,204" and "342 attempts" beside it, which left
 * the one thing that tells two entries on a category apart looking like
 * incidental metadata.
 */
export function SubcategoryTags({ entry }: { entry: SubcategoryNamed }) {
    const labels = entrySubcategoryLabels(entry);
    if (labels.length === 0) return null;
    return (
        <span className={styles.tags}>
            {labels.map((label) => (
                <span key={label} className={styles.tag} title={label}>
                    {label}
                </span>
            ))}
        </span>
    );
}
