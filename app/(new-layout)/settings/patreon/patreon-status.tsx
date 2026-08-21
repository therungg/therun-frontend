import Link from '~src/components/link';
import { BunnyIcon } from '~src/icons/bunny-icon';
import styles from './patreon.module.scss';

export function PatreonStatus({ tier }: { tier: 1 | 2 | 3 }) {
    return (
        <div className={styles.statusCard}>
            <BunnyIcon size={32} />
            <div>
                <div className={styles.statusTitle}>Linked — Tier {tier}</div>
                <p>Thank you for supporting therun.gg.</p>
            </div>
            <div className={styles.statusActions}>
                <Link
                    href="/settings/appearance"
                    className="btn btn-primary btn-sm"
                >
                    Customise your name
                </Link>
                <a
                    href="https://patreon.com/therungg"
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline-secondary btn-sm"
                >
                    Manage on Patreon
                </a>
            </div>
        </div>
    );
}
