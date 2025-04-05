import { hasFlag } from "country-flag-icons";
import { countries } from "~src/common/countries";
import { CountryIcon } from "~src/components/user/userform";

export const EventLocation = ({ location }: { location: string }) => {
    return (
        <>
            {countries()[location as keyof typeof countries] ?? location}
            {hasFlag(location as string) && (
                <span className="ms-1">
                    <CountryIcon
                        countryCode={location as keyof typeof countries}
                    />
                </span>
            )}
        </>
    );
};
