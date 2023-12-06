"use client";

import React, { ReactNode } from "react";
import { usePatreons } from "~src/components/patreon/use-patreons";
import { UserLink } from "~src/components/links/links";
import Link from "next/link";

const FooterLink = ({
    href,
    target,
    rel,
    children,
}: {
    href: string;
    target?: string;
    rel?: string;
    children: ReactNode;
}) => {
    return (
        <Link
            className={
                "tw-border-b tw-border-b-transparent hover:tw-border-b-therun-green"
            }
            href={href}
            target={target}
            rel={rel}
        >
            {children}
        </Link>
    );
};

export const Footer = () => {
    const { data: patreonData } = usePatreons();

    return (
        <footer>
            <div className="tw-container tw-mx-auto tw-py-4">
                <div className="tw-relative tw-flex tw-overflow-x-hidden">
                    <div className="tw-gap-3 tw-flex tw-flex-row tw-py-12 tw-animate-marquee tw-whitespace-nowrap">
                        <span className="tw-pl-12 tw-font-semibold">
                            A special thanks to our Tier 3 Patrons:
                        </span>
                        {Object.entries(patreonData || {})
                            .sort(() => Math.random() - 0.5)
                            .filter(([, v]) => {
                                if (!v.tier || v.tier < 3) return false;

                                return (
                                    !v.preferences ||
                                    v.preferences.featureInScrollbar
                                );
                            })
                            .map(([k]) => {
                                return (
                                    <div className="" key={`${k}patron`}>
                                        <UserLink
                                            key={`${k}patron`}
                                            username={k}
                                        />
                                    </div>
                                );
                            })}
                    </div>
                    <div className="tw-gap-3 tw-flex tw-flex-row tw-absolute tw-top-0 tw-py-12 tw-animate-marquee2 tw-whitespace-nowrap">
                        <span className="tw-pl-12 tw-font-semibold">
                            A special thanks to our Tier 3 Patrons:
                        </span>
                        {Object.entries(patreonData || {})
                            .sort(() => Math.random() - 0.5)
                            .filter(([, v]) => {
                                if (!v.tier || v.tier < 3) return false;

                                return (
                                    !v.preferences ||
                                    v.preferences.featureInScrollbar
                                );
                            })
                            .map(([k]) => {
                                return (
                                    <div className="" key={`${k}patron`}>
                                        <UserLink
                                            key={`${k}patron`}
                                            username={k}
                                        />
                                    </div>
                                );
                            })}
                    </div>
                </div>
                <div
                    className={
                        "tw-flex tw-flex-row tw-gap-8 tw-justify-between"
                    }
                >
                    <div className={"tw-flex tw-flex-col tw-gap-1"}>
                        <h3 className={"tw-text-2xl tw-text-bold"}>General</h3>
                        <FooterLink href={"/about"}>About</FooterLink>
                        <FooterLink href={"/roadmap"}>Roadmap</FooterLink>
                        <FooterLink href={"/faq"}>FAQ</FooterLink>
                        <FooterLink href={"/live"}>Live</FooterLink>
                        <FooterLink href={"/blog"}>Blog</FooterLink>
                    </div>
                    <div className={"tw-flex tw-flex-col tw-gap-1"}>
                        <h3 className={"tw-text-2xl tw-text-bold"}>Media</h3>
                        <FooterLink href={"/media"}>Media kit</FooterLink>
                    </div>
                    <div className={"tw-flex tw-flex-col tw-gap-1"}>
                        <h3 className={"tw-text-2xl tw-text-bold"}>
                            Privacy and Terms
                        </h3>
                        <FooterLink href={"/terms"}>
                            Terms and conditions
                        </FooterLink>
                        <FooterLink href={"/privacy-policy"}>
                            Privacy Policy
                        </FooterLink>
                    </div>
                    <div className={"tw-flex tw-flex-col tw-gap-1"}>
                        <h3 className={"tw-text-2xl tw-text-bold"}>Contact</h3>
                        <FooterLink href={"/contact"}>Contact form</FooterLink>
                        <FooterLink
                            rel={"noreferrer"}
                            target={"_blank"}
                            href={process.env.NEXT_PUBLIC_DISCORD_URL || ""}
                        >
                            Discord
                        </FooterLink>
                        <FooterLink
                            rel={"noreferrer"}
                            target={"_blank"}
                            href={process.env.NEXT_PUBLIC_TWITTER_URL || ""}
                        >
                            Twitter
                        </FooterLink>
                        <FooterLink
                            rel={"noreferrer"}
                            target={"_blank"}
                            href={"mailto:info@therun.gg"}
                        >
                            info@therun.gg
                        </FooterLink>
                    </div>
                </div>
            </div>
        </footer>
    );
};
