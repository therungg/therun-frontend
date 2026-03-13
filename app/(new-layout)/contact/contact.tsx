'use client';
import type React from 'react';
import { Image } from 'react-bootstrap';

export const Contact = () => {
    return (
        <div>
            <h1>Contact me</h1>
            <p>
                Therun.gg is in an Beta version and will improve and change a
                lot over the coming months. I would love to get your
                suggestions, tips or remarks.
            </p>
            <p>
                If you want to, I made a&nbsp;
                <a
                    rel="noreferrer"
                    target="_blank"
                    href={process.env.NEXT_PUBLIC_DISCORD_URL}
                >
                    Discord
                </a>
                , you can message me on&nbsp;
                <a
                    rel="noreferrer"
                    target="_blank"
                    href={process.env.NEXT_PUBLIC_TWITTER_URL}
                >
                    Twitter
                </a>
                {', '}
                <a
                    rel="noreferrer"
                    target="_blank"
                    href={process.env.NEXT_PUBLIC_BLUESKY_URL}
                >
                    Bluesky
                </a>{' '}
                or send me an email at&nbsp;
                <a
                    rel="noreferrer"
                    target="_blank"
                    href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL}`}
                >
                    {process.env.NEXT_PUBLIC_CONTACT_EMAIL}
                </a>
            </p>

            <div className="d-flex justify-content-end">
                <Image
                    src="/ContactformTR-light.png"
                    alt="Contact"
                    height={220}
                />
            </div>
        </div>
    );
};

export default Contact;
