import styles from './loading.module.scss';

const NAV_ITEMS = Array.from({ length: 5 });

// Route-level loading UI for the admin console (`manage/page.tsx`, plus
// every sub-route under it without its own `loading.tsx`). Pure static
// markup, geometry-matched to console.module.scss's shell.
export default function ManageLoading() {
    return (
        <div className={styles.shell}>
            <div className={styles.header}>
                <div className={styles.cover} />
                <div className={styles.titleBar} />
            </div>
            <div className={styles.body}>
                <div className={styles.sidebar}>
                    {NAV_ITEMS.map((_, i) => (
                        <div className={styles.navItem} key={`nav-${i}`} />
                    ))}
                </div>
                <div className={styles.content} />
            </div>
        </div>
    );
}
