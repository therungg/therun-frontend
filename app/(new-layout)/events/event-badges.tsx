import clsx from 'clsx';
import { FaCrown, FaHeart } from 'react-icons/fa6';
import {
    EventFromSearch,
    EventWithOrganizerName,
    eventTierShortNames,
} from 'types/events.types';
import styles from './event.styles.module.scss';

export const EventBadges = ({
    event,
}: {
    event: EventFromSearch | EventWithOrganizerName;
}) => {
    const isLive =
        new Date().getTime() < new Date(event.endsAt).getTime() &&
        new Date().getTime() > new Date(event.startsAt).getTime();

    return (
        <div className={styles.badgeRow}>
            {
                // This was vibe coded
                isLive && (
                    <span
                        className={clsx(
                            'badge bg-danger text-white',
                            styles.eventBadge,
                        )}
                    >
                        <span className="ping-dot-container me-1">
                            <span className="ping-dot-ping"></span>
                            <span className="ping-dot"></span>
                        </span>
                        LIVE NOW
                    </span>
                )
            }
            <span
                className={clsx('badge', styles.eventBadge, {
                    'bg-warning text-dark': event.tier === 1,
                    'bg-success text-white': event.tier === 2,
                    'bg-primary text-white': event.tier === 3,
                    'bg-secondary text-white':
                        event.tier !== 1 &&
                        event.tier !== 2 &&
                        event.tier !== 3,
                })}
            >
                {eventTierShortNames[
                    event.tier as keyof typeof eventTierShortNames
                ] || event.tier}{' '}
                {event.tier === 1 && <FaCrown />}
            </span>
            <span
                className={clsx('badge', styles.eventBadge, {
                    'bg-danger text-white': event.isOffline,
                    'bg-info text-dark': !event.isOffline,
                })}
            >
                {event.isOffline ? 'Offline' : 'Online'}
            </span>
            <span
                className={clsx(
                    'badge bg-primary text-white',
                    styles.eventBadge,
                )}
            >
                {event.type}
            </span>
            {event.isForCharity && (
                <span
                    className={clsx(
                        'badge bg-info text-dark',
                        styles.eventBadge,
                    )}
                >
                    For Charity <FaHeart size={8} />
                </span>
            )}
            <span
                className={clsx(
                    'badge bg-secondary text-white',
                    styles.eventBadge,
                )}
            >
                {event.language}
            </span>
        </div>
    );
};
