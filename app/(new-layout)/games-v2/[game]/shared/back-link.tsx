import { ArrowLeft } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import styles from './back-link.module.scss';

interface Props {
    href: string;
    label: string;
    className?: string;
}

/**
 * The one up-navigation pattern across games-v2 (Task 9): quiet-link tier +
 * leading ArrowLeft. Copy standard — "Back to leaderboard" on public
 * surfaces (submit, manage-run header), "Back to console" on console
 * sub-routes (roster, runner, wizard header). Destinations are the
 * consumer's concern; this only owns the look.
 */
export function BackLink({ href, label, className }: Props) {
    return (
        <Link
            href={href}
            className={className ? `${styles.link} ${className}` : styles.link}
        >
            <ArrowLeft size={14} aria-hidden />
            {label}
        </Link>
    );
}
