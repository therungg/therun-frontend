'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BunnyIcon } from '~src/icons/bunny-icon';
import { Can } from '~src/rbac/Can.component';
import { MobileMenu } from './MobileMenu';
import { NavGroup } from './NavGroup';
import navGroupStyles from './NavGroup.module.scss';
import topbarStyles from './Topbar.module.scss';
import { TopbarLogo } from './TopbarLogo';
import { TopbarUtilities } from './TopbarUtilities';
import {
    aboutItems,
    competeItems,
    exploreItems,
    toolsItems,
} from './topbar-nav-items';

interface TopbarProps {
    username: string;
    picture: string;
    sessionError: string | null;
}

export const Topbar = ({
    username,
    picture,
    sessionError,
}: Partial<TopbarProps>) => {
    const pathname = usePathname();

    // Helper for admin items rendered via children
    const adminLink = (href: string, label: string) => (
        <Link
            key={href}
            href={href}
            className={`${navGroupStyles.item} ${pathname.startsWith(href) ? navGroupStyles.active : ''}`}
            role="menuitem"
        >
            {label}
        </Link>
    );

    return (
        <nav className={topbarStyles.topbar}>
            <TopbarLogo />

            <div className={topbarStyles.nav}>
                <NavGroup label="Explore" items={exploreItems} />
                <NavGroup label="Compete" items={competeItems} />
                {username && <NavGroup label="Tools" items={toolsItems} />}
                <AdminNavGroup adminLink={adminLink} />
                <NavGroup label="About" items={aboutItems} />
            </div>

            <div className={topbarStyles.utilities}>
                <Link href="/patron" className={topbarStyles.supportLink}>
                    Support us <BunnyIcon />
                </Link>
                <TopbarUtilities
                    username={username}
                    picture={picture}
                    sessionError={sessionError}
                />
            </div>

            <MobileMenu username={username} />
        </nav>
    );
};

Topbar.displayName = 'Topbar';

// Separate component for Admin group — uses children pattern for per-item RBAC
function AdminNavGroup({
    adminLink,
}: {
    adminLink: (href: string, label: string) => React.ReactNode;
}) {
    return (
        <Can I="view-restricted" a="admins">
            <NavGroup label="Admin">
                <Can I="view-restricted" a="admins">
                    {adminLink('/data', 'Stats')}
                </Can>
                <Can I="moderate" a="roles">
                    {adminLink('/admin/roles', 'Roles')}
                    {adminLink('/admin/move-user', 'Move User')}
                </Can>
                <Can I="moderate" a="admins">
                    {adminLink('/admin/exclusions', 'Exclusions')}
                </Can>
            </NavGroup>
        </Can>
    );
}
