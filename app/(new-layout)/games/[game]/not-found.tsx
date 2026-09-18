import { Compass } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import styles from './not-found.module.scss';

// Catches every `notFound()` thrown under [game] — the board page, run
// and manual-time detail, submit, and the manage gate. Renders inside the
// shared (new-layout) layout, so site chrome survives. Pure static markup.
export default function GameNotFound() {
    return (
        <div className={styles.wrap}>
            <div className={styles.panel}>
                <Compass size={28} className={styles.icon} aria-hidden />
                <h1 className={styles.title}>There&rsquo;s no board here.</h1>
                <p className={styles.hint}>
                    The game or run you&rsquo;re looking for doesn&rsquo;t exist
                    or was removed.
                </p>
                <div className={styles.actions}>
                    <Link href="/games" className={styles.primaryLink}>
                        Browse games
                    </Link>
                    <Link href="/" className={styles.secondaryLink}>
                        Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
