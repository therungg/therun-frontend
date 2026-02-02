import styles from './css/ScrollDown.module.scss';

// TODO: Move this to icons.
export const ScrollDown = () => {
    return (
        <div className={styles.mouse + ` d-none d-lg-block mt-3`}>
            <div className={styles.scroller}></div>
        </div>
    );
};
