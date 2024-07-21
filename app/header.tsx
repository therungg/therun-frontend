import dynamic from "next/dynamic";

const Topbar = dynamic(() => import("~src/components/topbar"), {
    ssr: false,
});

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
