import { NameAsPatreon } from "~src/components/patreon/patreon-name";

export const WrappedTitle = ({ user }: { user: string }) => {
    return (
        <h1 className="mb-4 flex-center display-4 fw-bold">
            Speedrun Wrapped for <NameAsPatreon name={user} />
        </h1>
    );
};
