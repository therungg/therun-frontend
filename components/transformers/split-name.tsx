export const SplitName = ({ splitName }: { splitName: string }) => {
    if (!splitName || splitName.length < 1) return <></>;

    splitName = splitName.toString();

    if (splitName.startsWith("-")) splitName = splitName.replace("-", "");

    if (splitName.startsWith("{") && splitName.includes("}")) {
        splitName = splitName.replace("{", "");

        const [fullSegmentName, subsplitName] = splitName.split("}");

        return (
            <>
                <b>
                    <i>{fullSegmentName}</i>
                </b>
                &nbsp;-&nbsp;{subsplitName}
            </>
        );
    }

    return <>{splitName}</>;
};

export const convertSplitName = (splitName: string) => {
    if (!splitName || splitName.length < 1) return "";

    splitName = splitName.toString();

    if (splitName.startsWith("-")) splitName = splitName.replace("-", "");

    if (splitName.startsWith("{") && splitName.includes("}")) {
        splitName = splitName.replace("{", "");

        const [fullSegmentName, subsplitName] = splitName.split("}");

        return `${fullSegmentName} - ${subsplitName}`;
    }

    return splitName;
};

export default SplitName;
