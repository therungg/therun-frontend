import { TwitchLoginButton } from '~src/components/twitch/TwitchLoginButton';
import styles from './settings.module.scss';

export function LoginRequired({ returnTo }: { returnTo: string }) {
    return (
        <div className={styles.loginRequired}>
            <h1>Settings</h1>
            <p>Log in with Twitch to manage your account settings.</p>
            <TwitchLoginButton returnTo={returnTo} />
        </div>
    );
}
