import { NameAsPatreon } from "~src/components/patreon/patreon-name";

export const WrappedTitle = ({ user }: { user: string }) => {
    return (
        <h1 className="my-5 text-center display-4 fw-medium">
            Speedrun Wrapped for
            <span className="ms-3">
                <NameAsPatreon name={user} />
            </span>
        </h1>
    );
};
