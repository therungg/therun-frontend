import { WrappedWithData } from "../wrapped-types";

export const WrappedSocialImages = ({
    wrapped,
}: {
    wrapped: WrappedWithData;
}) => {
    return <>{wrapped.user}</>;
};
