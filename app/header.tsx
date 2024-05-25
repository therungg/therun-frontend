import Topbar from "~src/components/topbar";

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
        <header className="bg-body-secondary">
            <Topbar
                username={username}
                picture={picture}
                sessionError={sessionError}
            />
        </header>
    );
};
