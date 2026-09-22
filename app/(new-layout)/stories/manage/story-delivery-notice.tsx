import moment from 'moment';
import React from 'react';
import { StoryDelivery } from '~app/(new-layout)/live/story.types';
import styles from './manage-stories.module.scss';

// One place for the drop-code copy. The stories API may send codes this build
// does not know about, so anything missing here falls back to Twitch's own
// wording.
const DROP_COPY: Record<string, string> = {
    followers_only_mode:
        'Your chat is in followers-only mode, so Twitch refuses messages from therun_gg. Turn followers-only off, or give therun_gg VIP or moderator in your channel.',
    banned_phone_alias:
        'Twitch blocked the message because the phone number on our bot account is banned in your channel. Unban therun_gg in your channel settings.',
    user_timed_out:
        'therun_gg is timed out in your chat. Remove the timeout to get stories again.',
    user_banned:
        'therun_gg is banned in your chat. Unban it to get stories again.',
};

const toMillis = (value: string | null): number | null => {
    if (!value) return null;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
};

const relativeTime = (value: string | null): string | null => {
    if (!value) return null;
    const parsed = moment(value);
    return parsed.isValid() ? parsed.fromNow() : null;
};

interface Props {
    delivery: StoryDelivery | null;
}

export const StoryDeliveryNotice = ({ delivery }: Props) => {
    if (!delivery) return null;

    const { lastSentAt, lastDrop } = delivery;

    const sentAtMillis = toMillis(lastSentAt);
    const dropAtMillis = toMillis(lastDrop?.at ?? null);

    // A drop only counts as the current state if nothing has been delivered
    // since it happened.
    const hasProblem =
        !!lastDrop &&
        (sentAtMillis === null ||
            (dropAtMillis !== null && dropAtMillis > sentAtMillis));

    if (hasProblem && lastDrop) {
        const known = DROP_COPY[lastDrop.code];
        const quoted = lastDrop.message?.trim() || lastDrop.code;
        const body = known ?? `Twitch said: "${quoted}"`;
        const dropped = relativeTime(lastDrop.at);

        return (
            <div className={`${styles.requirements} ${styles.deliveryProblem}`}>
                <div className={styles.requirementItem}>
                    <span className={styles.requirementIcon}>⚠️</span>
                    <strong className={styles.deliveryHeading}>
                        Twitch is dropping your story messages
                    </strong>
                </div>
                <div className={styles.requirementItem}>{body}</div>
                {dropped && (
                    <div className={styles.requirementItem}>
                        Last dropped {dropped}.
                    </div>
                )}
            </div>
        );
    }

    const sent = relativeTime(lastSentAt);

    if (!sent) return null;

    return (
        <p className={styles.deliveryFine}>
            Last story sent to your chat {sent}.
        </p>
    );
};

export default StoryDeliveryNotice;
