'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import { XLg } from 'react-bootstrap-icons';
import { FaPatreon, FaPaypal, FaStripeS } from 'react-icons/fa';
import { SiKofi } from 'react-icons/si';
import { useSession } from '~src/components/session-provider';
import { BunnyIcon } from '~src/icons/bunny-icon';
import styles from './styles/support-notice.module.scss';

const STORAGE_KEY = 'support-notice-dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000;

export function SupportNotice() {
    const { roles } = useSession();
    const pathname = usePathname();
    const [visible, setVisible] = useState(false);

    const isSupporter = roles?.some(
        (role) =>
            role === 'patreon1' || role === 'patreon2' || role === 'patreon3',
    );

    useEffect(() => {
        try {
            const dismissedAt = Number(localStorage.getItem(STORAGE_KEY) ?? 0);

            setVisible(Date.now() - dismissedAt >= DISMISS_DURATION);
        } catch {
            setVisible(true);
        }
    }, []);

    const dismiss = () => {
        setVisible(false);

        try {
            localStorage.setItem(STORAGE_KEY, Date.now().toString());
        } catch {}
    };

    if (!visible || isSupporter || pathname === '/patron') {
        return null;
    }

    return (
        <aside className={styles.notice} aria-label="Support therun.gg">
            <div className={styles.inner}>
                <span className={styles.icon} aria-hidden="true">
                    <BunnyIcon size={26} />
                </span>

                <div className={styles.copy}>
                    <strong className={styles.title}>
                        Help keep therun.gg online
                    </strong>
                    <p className={styles.description}>
                        The site costs more to run than it brings in, and I
                        can't really pay out of pocket for it anymore. If you
                        use therun regularly, please consider supporting it.
                    </p>
                </div>

                <div className={styles.actions}>
                    <a
                        href="https://patreon.com/therungg"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${styles.cta} btn btn-primary btn-sm`}
                    >
                        <FaPatreon aria-hidden />
                        Become a patron
                    </a>

                    <Dropdown align="end">
                        <Dropdown.Toggle
                            id="support-donation-dropdown"
                            variant="secondary"
                            size="sm"
                            className={`${styles.cta} ${styles.donate}`}
                        >
                            Donate
                        </Dropdown.Toggle>

                        <Dropdown.Menu className={styles.donationMenu}>
                            <Dropdown.Item
                                href={
                                    'https://www.paypal.com/ncp/payment/4MWKCJ6MY5HDQ'
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.donationItem}
                            >
                                <FaPaypal aria-hidden />
                                PayPal
                            </Dropdown.Item>

                            <Dropdown.Item
                                href="https://ko-fi.com/therungg"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.donationItem}
                            >
                                <SiKofi aria-hidden />
                                Ko-fi
                            </Dropdown.Item>

                            <Dropdown.Item
                                href={
                                    'https://donate.stripe.com/8wMg2RgR3gNfblu7ss'
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.donationItem}
                            >
                                <FaStripeS aria-hidden />
                                Card (Stripe)
                            </Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                </div>

                <button
                    type="button"
                    className={styles.dismiss}
                    onClick={dismiss}
                    aria-label="Dismiss support notice for seven days"
                >
                    <XLg size={14} aria-hidden />
                </button>
            </div>
        </aside>
    );
}
