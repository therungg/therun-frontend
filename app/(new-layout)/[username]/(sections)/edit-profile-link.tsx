import { PencilSquare } from 'react-bootstrap-icons';
import { getSession } from '~src/actions/session.action';
import Link from '~src/components/link';
import styles from './sections.module.scss';

/** Only the runner themself sees the way to their profile settings. */
export async function EditProfileLink({ name }: { name: string }) {
    const session = await getSession();
    if (session.username?.toLowerCase() !== name.toLowerCase()) return null;
    return (
        <Link href="/settings/profile" className={styles.editProfile}>
            <PencilSquare size={14} aria-hidden />
            Edit profile
        </Link>
    );
}
