"use client";

import Image from "next/image";
import useColorMode from "~src/hooks/use-color-mode";
import Hamburger from "~src/icons/hamburger";
import { ReactNode, useState } from "react";
import Link from "next/link";
import { PatreonBunnySvgWithoutLink } from "~app/patron/patreon-info";
import Twitch from "~src/icons/twitch";
import { AutoCompletion } from "~src/components/search/autocompletion";

const navigationMenu = [
    {
        label: "Live",
        slug: "/live",
        isBold: true,
    },
    {
        label: "Games",
        slug: "/games/",
        isBold: false,
    },
    {
        label: "PACE LTA",
        slug: "/gsa",
        isBold: false,
    },
    {
        label: "Support",
        slug: "/patron",
        isBold: false,
        icon: <PatreonBunnySvgWithoutLink />,
    },
];

function NavLink({
    href,
    isBold,
    className,
    children,
}: {
    href: string;
    isBold?: boolean;
    className?: string;
    children: ReactNode;
}) {
    return (
        <li>
            <Link
                data-bold={isBold ? "yes" : "no"}
                href={href}
                className={className}
            >
                {children}
            </Link>
        </li>
    );
}

export const Header = ({
    username,
    // eslint-disable-next-line no-unused-vars
    picture,
}: {
    username?: string;
    picture?: string;
}) => {
    const { getColorMode } = useColorMode();
    const [menuIsOpen, setMenuIsOpen] = useState(true);

    return (
        <header className="tw-border-b-4 tw-border-b-therun-green tw-mb-4 px-5">
            <div className="tw-container tw-mx-auto tw-py-5 tw-px-3  tw-flex tw-gap-8 tw-justify-between tw-items-center tw-flex-wrap">
                <Link
                    href={"/"}
                    className="tw-flex tw-flex-row tw-items-center tw-flex-grow lg:tw-flex-none"
                >
                    <Image
                        className={"tw-w-10"}
                        alt={"TheRun"}
                        src={`/logo_${getColorMode()}_theme_no_text_transparent.png`}
                        height={"75"}
                        width={"75"}
                    />
                    <h1 className="tw-text-therun-green tw-text-3xl tw-border-2 tw-border-transparent hover:tw-border-b-2 hover:tw-border-b-therun-green">
                        The Run <span className="tw-ordinal">beta</span>
                    </h1>
                </Link>
                <div className="lg:tw-hidden tw-flex tw-flex-row tw-items-center">
                    <button onClick={() => setMenuIsOpen(!menuIsOpen)}>
                        <Hamburger
                            isOpen={menuIsOpen}
                            className="tw-text-therun-green tw-w-8 tw-h-8"
                        />
                    </button>
                </div>
                <div
                    data-state={menuIsOpen ? "open" : "closed"}
                    className="tw-justify-end tw-basis-full lg:tw-flex-grow lg:tw-basis-auto data-[state=open]:tw-flex lg:data-[state=closed]:tw-flex data-[state=closed]:tw-hidden lg:tw-flex tw-flex-col tw-gap-4 lg:tw-flex-row"
                >
                    <ul className="tw-flex tw-flex-col tw-gap-3 lg:tw-flex-row lg:tw-items-center">
                        {username && (
                            <NavLink
                                isBold
                                className="tw-font-bold tw-border-2 tw-border-transparent tw-text-lg hover:tw-border-b-2 hover:tw-border-b-therun-green"
                                href={"/upload"}
                            >
                                Upload
                            </NavLink>
                        )}
                        {navigationMenu.map((item) => (
                            <NavLink
                                isBold={item.isBold}
                                key={item.label}
                                className="data-[bold=yes]:tw-font-bold tw-font-normal tw-flex tw-flex-row tw-gap-2 tw-items-center tw-text-left tw-border-2 tw-border-transparent tw-text-lg hover:tw-border-b-2 hover:tw-border-b-therun-green"
                                href={item.slug}
                            >
                                {item.label} {item.icon}
                            </NavLink>
                        ))}
                        {!username && (
                            <NavLink
                                href={"/api"}
                                className=" tw-font-bold tw-px-2 tw-bg-twitch-purple tw-border-purple-950 hover:tw-bg-twitch-purple-hover tw-text-white tw-flex-row tw-flex tw-items-center tw-gap-2 tw-text-lg tw-p-2 tw-border tw-rounded"
                            >
                                Login with Twitch <Twitch />
                            </NavLink>
                        )}
                        <li>
                            <AutoCompletion />
                        </li>
                    </ul>
                </div>
            </div>
        </header>
    );
};
