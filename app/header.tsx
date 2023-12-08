import Topbar from "~src/components/topbar";

export const Header = ({
    username,
    picture,
}: {
    username?: string;
    picture?: string;
}) => {
    return (
        <header className="bg-body-secondary">
            <Topbar username={username} picture={picture} />
        </header>
    );
};
