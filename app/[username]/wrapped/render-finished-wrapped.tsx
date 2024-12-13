import { Wrapped } from "~app/[username]/wrapped/wrapped-types";

interface DisplayWrappedProps {
    user: string;
    wrapped: Wrapped;
}

// Todo:: actually render this shit
export const RenderFinishedWrapped = ({ wrapped }: DisplayWrappedProps) => {
    return <div>{JSON.stringify(wrapped, null, 2)}</div>;
};
