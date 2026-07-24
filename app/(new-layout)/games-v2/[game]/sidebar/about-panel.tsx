import styles from './sidebar.module.scss';

// Line-clamp is inline (not in sidebar.module.scss) only because that file
// currently carries unrelated in-flight changes — fold it in later.
const clampStyle = {
    display: '-webkit-box',
    WebkitLineClamp: 6,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
} as const;

export function AboutPanel({ about }: { about: string | null }) {
    if (!about?.trim()) return null;
    return (
        <section className={styles.panel}>
            <div className={styles.panelHead}>
                <span className={styles.eyebrow}>About</span>
            </div>
            <p className="text-muted small mb-0" style={clampStyle}>
                {about}
            </p>
        </section>
    );
}
