import { hasFlag } from "country-flag-icons";
import { countries } from "~src/common/countries";
import { CountryIcon } from "~src/components/user/userform";

export const EventLocation = ({
    location,
    margin = 1,
}: {
    location: string;
    margin?: number;
}) => {
    return (
        <>
            {countries()[location as keyof typeof countries] ?? location}
            {hasFlag(location as string) && (
                <span className={"ms-" + margin}>
                    <CountryIcon
                        countryCode={location as keyof typeof countries}
                    />
                </span>
            )}
        </>
    );
};
