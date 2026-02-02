import { ErrorBoundary } from 'react-error-boundary';
import { Topbar } from '~src/components/Topbar/Topbar';
import { TopbarSkeleton } from '~src/components/Topbar/TopbarSkeleton';

interface HeaderProps {
    username: string;
    picture: string;
    sessionError: string | null;
}

export const Header = ({
    username,
    picture,
    sessionError,
}: Partial<HeaderProps>) => {
    return (
        <ErrorBoundary fallback={<TopbarSkeleton />}>
            <header className="bg-body-secondary">
                <Topbar
                    username={username}
                    picture={picture}
                    sessionError={sessionError}
                />
            </header>
        </ErrorBoundary>
    );
};
