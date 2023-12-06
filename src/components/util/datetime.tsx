import moment from "moment/moment";

interface IsoToFormattedProps {
    iso: string | Date;
}

interface DurationToFormattedProps {
    duration: string | number;
    withMillis?: boolean;
    withDays?: boolean;
    padded?: boolean;
    human?: boolean;
}

export const getFullDate = (iso: string | Date) => {
    return moment(iso).format("YYYY-MM-DD hh:mm:ss");
};

export const getMonthDay = (iso: string | Date) => {
    return moment(iso).format("YYYY-MM-DD");
};

export const IsoToFormatted = ({ iso }: IsoToFormattedProps) => {
    if (iso === "0") return <i>Unknown</i>;
    return <>{moment(iso).format("L LT")}</>;
};

export const Difference = ({
    one,
    two,
    withMillis = false,
    isGold = false,
    human = true,
}: {
    one: string;
    two: string;
    withMillis?: boolean;
    isGold?: boolean;
    human?: boolean;
}) => {
    const diff = parseInt(one) - parseInt(two);

    if (!diff && diff !== 0) return <>-</>;

    if (diff > -60000 && diff < 60000) withMillis = true;

    const formatted = `${diff <= 0 ? "-" : "+"}${getFormattedString(
        Math.abs(diff).toString(),
        withMillis,
        false,
        human,
        true
    )}`;

    return (
        <abbr
            title={`${diff <= 0 ? "-" : "+"}${getFormattedString(
                Math.abs(diff).toString(),
                true,
                false,
                human,
                false
            )}`}
        >
            <div
                style={{
                    color: isGold
                        ? "var(--bs-secondary)"
                        : diff <= 0
                        ? "var(--bs-link-color)"
                        : "var(--bs-red)",
                }}
            >
                {formatted}
            </div>
        </abbr>
    );
};

export const DifferenceFromOne = ({
    diff,
    withMillis = false,
}: {
    diff: number;
    withMillis?: boolean;
}) => {
    if (!diff && diff !== 0) return <></>;
    const formatted = `${diff <= 0 ? "-" : "+"}${getFormattedString(
        Math.abs(diff).toString(),
        withMillis,
        false,
        true
    )}`;

    return (
        <abbr
            title={`${diff <= 0 ? "-" : "+"}${getFormattedString(
                Math.abs(diff).toString(),
                true,
                false
            )}`}
        >
            <div
                className="text-end"
                style={{
                    color: diff <= 0 ? "var(--bs-link-color)" : "var(--bs-red)",
                }}
            >
                {formatted}
            </div>
        </abbr>
    );
};

export const getNumberDifference = (one: number, two: number): string => {
    const result = one - two;

    if (result > 0) return `+${result}`;

    return result.toString();
};

export const getPercentageDifference = (one: number, two: number): string => {
    const result = (one / two) * 100 - 100;

    return `${(result > 0 ? "+" : "") + result.toFixed(0)}%`;
};

export const getDurationAsTimer = (duration: string) => {
    const formatNumber = (value: number): string => {
        return String(value).padStart(2, "0");
    };

    let milli = parseInt(duration);
    if (milli < 0) milli *= -1;

    if (!milli && milli !== 0) return "-";

    const seconds = Math.floor((milli / 1000) % 60);
    const minutes = Math.floor((milli / (60 * 1000)) % 60);
    const hours = Math.floor(milli / (60 * 60 * 1000));

    return `${formatNumber(hours)}:${formatNumber(minutes)}:${formatNumber(
        seconds
    )}`;
};

export const getFormattedString = (
    duration: string,
    withMillis: boolean = false,
    padded: boolean = false,
    human: boolean = true,
    difference: boolean = false,
    showDays = false
) => {
    let milli = parseInt(duration);
    if (milli < 0) milli *= -1;

    if (!milli && milli !== 0) return "-";

    const milliseconds = String(milli % 1000).padStart(3, "0");
    const seconds = String(Math.floor((milli / 1000) % 60)).padStart(2, "0");
    const minutes = String(Math.floor((milli / (60 * 1000)) % 60)).padStart(
        2,
        "0"
    );
    const hours = Math.floor(milli / (60 * 60 * 1000));
    const days = Math.floor(hours / 24);

    if (showDays && days >= 10) {
        return `${days} days`;
    }

    if (!withMillis && human) {
        if (hours >= 100)
            return `${padded ? hours.toLocaleString() : hours} hours`;
        if (hours >= 10)
            return `${padded ? hours.toLocaleString() : hours}h ${minutes}m`;
    }

    let formatted = "";

    if (hours > 0) formatted += `${hours.toString()}:`;
    formatted +=
        (difference && withMillis && milli < 60000 ? "" : `${minutes}:`) +
        seconds;

    if (withMillis) formatted += `.${milliseconds}`;

    return formatted;
};

export const timeToMillis = (timeString: string) => {
    let time = 0;

    const millisSeperated = timeString.split(".");

    if (millisSeperated.length > 1 && !!millisSeperated[1]) {
        time += parseInt(millisSeperated[1]);
    }

    const seperated = millisSeperated[0].split(":").reverse();

    time += parseInt(seperated[0]) * 1000;

    if (seperated.length > 1 && !!seperated[1]) {
        time += parseInt(seperated[1]) * 1000 * 60;
    }

    if (seperated.length > 2 && !!seperated[2]) {
        time += parseInt(seperated[2]) * 1000 * 60 * 60;
    }

    return time;
};

export const DurationToFormatted = ({
    duration,
    withMillis = false,
    padded = false,
    human = true,
    withDays = false,
}: DurationToFormattedProps) => {
    if (withMillis)
        return <>{getFormattedString(duration, withMillis, padded, human)}</>;
    return (
        <>
            <abbr title={getFormattedString(duration, true, padded, human)}>
                {getFormattedString(
                    duration,
                    withMillis,
                    padded,
                    human,
                    false,
                    withDays
                )}
            </abbr>
        </>
    );
};

export const DurationAsTimer = ({ duration }: { duration: string }) => {
    return (
        <>
            <abbr title={getFormattedString(duration, true, false)}>
                {getDurationAsTimer(duration)}
            </abbr>
        </>
    );
};

export const FromNow = ({
    time,
    className,
}: {
    time: string | Date;
    className?: string;
}) => {
    return (
        <abbr title={moment(time).format("LLLL")} className={className}>
            {moment(time).fromNow()}
        </abbr>
    );
};
