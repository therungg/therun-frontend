import styles from './loading.module.scss';

// Route-level loading UI for the run detail page. Pure static markup,
// reusing run-view.tsx's own Bootstrap grid classes so the skeleton lands
// exactly where the real header/video/side-column will render.
export default function RunLoading() {
    return (
        <div>
            <header className="d-flex align-items-center gap-3 mb-3">
                <div className={styles.cover} />
                <div>
                    <div className={styles.titleBar} />
                    <div className={styles.badgeRow}>
                        <div className={styles.badge} />
                        <div className={styles.badge} />
                    </div>
                </div>
            </header>
            <div className="row g-3">
                <div className="col-lg-8">
                    <div className={styles.video} />
                </div>
                <div className="col-lg-4 d-flex flex-column gap-3">
                    <div className={styles.card} />
                    <div className={styles.line} />
                    <div className={styles.line} />
                </div>
            </div>
        </div>
    );
}
