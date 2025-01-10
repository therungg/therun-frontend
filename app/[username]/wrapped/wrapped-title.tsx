import { NameAsPatreon } from "~src/components/patreon/patreon-name";

export const WrappedTitle = ({ user }: { user: string }) => {
    return (
        <h1 className="mt-3 text-center display-1 fw-medium">
            Speedrun Recap for
            <span className="ms-3">
                <NameAsPatreon name={user} />
            </span>
        </h1>
    );
};
