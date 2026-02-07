import styles from '~app/(new-layout)/components/styles/panel.component.module.scss';

export const PanelSkeleton = () => {
    return (
        <div className={styles.bookmarkFolder}>
            <div className={styles.tab}>
                <div
                    style={{
                        width: '4rem',
                        height: '0.75rem',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(255, 255, 255, 0.3)',
                        marginBottom: '0.3rem',
                    }}
                />
                <div
                    style={{
                        width: '7rem',
                        height: '1.2rem',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(255, 255, 255, 0.5)',
                    }}
                />
            </div>
            <div style={{ padding: '1.5rem', minHeight: '200px' }}>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                    }}
                >
                    <div
                        style={{
                            width: '60%',
                            height: '1rem',
                            borderRadius: '4px',
                            backgroundColor: 'var(--bs-secondary-bg)',
                            opacity: 0.5,
                        }}
                    />
                    <div
                        style={{
                            width: '80%',
                            height: '1rem',
                            borderRadius: '4px',
                            backgroundColor: 'var(--bs-secondary-bg)',
                            opacity: 0.4,
                        }}
                    />
                    <div
                        style={{
                            width: '40%',
                            height: '1rem',
                            borderRadius: '4px',
                            backgroundColor: 'var(--bs-secondary-bg)',
                            opacity: 0.3,
                        }}
                    />
                </div>
            </div>
        </div>
    );
};
