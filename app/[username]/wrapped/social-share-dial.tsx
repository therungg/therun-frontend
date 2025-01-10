import React, { memo, useState } from "react";
import {
    FacebookMessengerShareButton,
    TwitterShareButton,
    WhatsappShareButton,
    FacebookMessengerIcon,
    TwitterIcon,
    WhatsappIcon,
    RedditShareButton,
    RedditIcon,
} from "react-share";
import {
    ClipboardHeartFill,
    ClipboardCheckFill,
    ClipboardXFill,
    ShareFill,
} from "react-bootstrap-icons/";
import socialStyles from "./social-icons.module.scss";

interface SocialShareSpeedDialProps {
    url: string;
    title: string;
    text: string;
}

export const SocialShareSpeedDial = memo<SocialShareSpeedDialProps>(
    ({ url, title, text }) => {
        const [isOpen, setIsOpen] = useState(false);
        const [copied, setCopied] = useState<"PENDING" | "SUCCESS" | "ERROR">(
            "PENDING",
        );

        const toggleSpeedDial = () => setIsOpen((prev) => !prev);

        const handleCopy = () => {
            navigator.clipboard
                .writeText(url || window.location.href)
                .then(() => {
                    setCopied("SUCCESS");
                    setTimeout(() => setCopied("PENDING"), 2000); // Reset "copied" after 2 seconds
                })
                .catch(() => {
                    setCopied("ERROR");
                });
        };

        return (
            <div className="position-relative p-3 d-flex flex-column align-items-center">
                <button
                    className={`btn btn-primary rounded-circle d-flex justify-content-center align-items-center shadow ${
                        isOpen ? "rotate-icon" : ""
                    }`}
                    style={{ width: "50px", height: "50px" }}
                    onClick={toggleSpeedDial}
                    aria-label="Toggle share options"
                >
                    <ShareFill size={24} />
                </button>

                <div
                    className={`d-flex flex-column align-items-center gap-2 position-absolute bottom-100 ${
                        isOpen ? "opacity-100" : "opacity-0"
                    }`}
                    style={{
                        transition: "opacity 0.3s",
                        pointerEvents: isOpen ? "auto" : "none",
                    }}
                >
                    <div className={socialStyles.socialIcon}>
                        <div
                            className="rounded-circle d-flex justify-content-center align-items-center"
                            style={{
                                width: "40px",
                                height: "40px",
                                backgroundColor: "#007bff",
                                cursor: "pointer",
                            }}
                            onClick={handleCopy}
                            title="Copy link to clipboard"
                        >
                            {copied === "SUCCESS" ? (
                                <ClipboardCheckFill size={24} color="#fff" />
                            ) : copied === "ERROR" ? (
                                <ClipboardXFill size={24} color="#fff" />
                            ) : (
                                // Pending state
                                <ClipboardHeartFill size={24} color="#fff" />
                            )}
                        </div>
                    </div>

                    <div className={socialStyles.socialIcon}>
                        {/* Social Share Buttons */}
                        <TwitterShareButton
                            url={url || window.location.href}
                            title={title}
                            via="therungg"
                        >
                            <TwitterIcon size={40} round />
                        </TwitterShareButton>
                    </div>
                    <div className={socialStyles.socialIcon}>
                        <FacebookMessengerShareButton
                            url={url || window.location.href}
                        >
                            <FacebookMessengerIcon size={40} round />
                        </FacebookMessengerShareButton>
                    </div>
                    <div className={socialStyles.socialIcon}>
                        <WhatsappShareButton
                            url={url || window.location.href}
                            title={text}
                        >
                            <WhatsappIcon size={40} round />
                        </WhatsappShareButton>
                    </div>
                    <div className={socialStyles.socialIcon}>
                        <RedditShareButton
                            url={url || window.location.href}
                            title={title}
                        >
                            <RedditIcon size={40} round />
                        </RedditShareButton>
                    </div>
                    <div className={socialStyles.socialIcon}>
                        <a
                            href={`https://bsky.app/intent/compose?text=${encodeURIComponent(
                                `${title}\n${url}`,
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-circle d-flex justify-content-center align-items-center"
                            style={{
                                width: "40px",
                                height: "40px",
                                backgroundColor: "#fff",
                                cursor: "pointer",
                            }}
                            title="Share on Bluesky"
                        >
                            <img
                                src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Bluesky_Logo.svg/2319px-Bluesky_Logo.svg.png"
                                alt="Bluesky"
                                width="24"
                                height="24"
                            />
                        </a>
                    </div>
                </div>
            </div>
        );
    },
);

SocialShareSpeedDial.displayName = "SocialShareSpeedDial";
