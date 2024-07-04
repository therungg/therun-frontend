import React from "react";
import { RouteGroup } from "./route-group";
import { Route } from "./route";
import { Upload } from "react-bootstrap-icons";

interface NavigationProps {
    username?: string;
}

export const Navigation = React.memo<NavigationProps>(({ username }) => {
    return (
        <nav>
            <ul className="list-unstyled">
                {username && (
                    <li className="m-3">
                        <a className="nav-link mh-2r" href="/upload">
                            <b>Upload</b>

                            <span className="ms-2">
                                <Upload fill="currentcolor" size={18} />
                            </span>
                        </a>
                    </li>
                )}

                <RouteGroup label="Navigation">
                    <Route label="Home" path="/" />
                    <Route label="Races" path="/races" />
                    <Route label="Tournaments" path="/tournaments" />
                    <Route label="Live" path="/live" />
                    <Route label="Games" path="/games" />
                </RouteGroup>
                <RouteGroup label="General">
                    <Route label="About" path="/about" />
                    <Route label="Roadmap" path="/roadmap" />
                    <Route label="FAQ" path="/faq" />
                    <Route label="blog" path="/blog" />
                </RouteGroup>
                <RouteGroup label="Media">
                    <Route label="Media kit" path="/media" />
                </RouteGroup>
                <RouteGroup label="Privacy and Terms">
                    <Route label="Terms and conditions" path="/terms" />
                    <Route label="Privacy Policy" path="/privacy-policy" />
                </RouteGroup>
                <RouteGroup label="Contact">
                    <Route label="Contact form" path="/contact" />
                    <Route
                        label="Discord"
                        path={process.env.NEXT_PUBLIC_DISCORD_URL}
                    />
                    <Route
                        label="Twitter/X"
                        path={process.env.NEXT_PUBLIC_TWITTER_URL}
                    />
                    <Route
                        label={process.env.NEXT_PUBLIC_CONTACT_EMAIL}
                        path={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL}`}
                    />
                </RouteGroup>
            </ul>
        </nav>
    );
});

Navigation.displayName = "Navigation";
