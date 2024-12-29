import { WrappedWithData } from "../wrapped-types";

const RenderWrappedSocialImages = ({
    wrapped,
}: {
    wrapped: WrappedWithData;
}) => {
    return <>{wrapped.user}</>;
};

export default RenderWrappedSocialImages;
