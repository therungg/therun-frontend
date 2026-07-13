import { getSession } from '~src/actions/session.action';
import styles from '~src/components/fast50/prep/prep-studio.module.scss';
import { confirmPermission } from '~src/rbac/confirm-permission';
import { PrepIndex } from './prep-index';

export const metadata = {
    robots: { index: false, follow: false },
};

export default async function PrepIndexPage() {
    const user = await getSession();
    try {
        confirmPermission(user, 'moderate', 'admins');
    } catch {
        return <main className={styles.denied}>Not authorized.</main>;
    }
    return (
        <main className={styles.page}>
            <PrepIndex />
        </main>
    );
}
