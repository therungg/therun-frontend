import { globbySync } from "globby";
import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
    const ignoredRoutes: string[] = [
        "/games/[game]/",
        "/live/[username]/",
        "/tournaments/[tournament]/",
        "/[username]/[game]/",
        "/blog/[post]/",
        "/[username]/[game]/[run]/",
        "/[username]/",
        "/upload-key/",
        "/change-appearance/",
    ];

    const pages = globbySync(["app/**/page.tsx", "!app/api"]);

    const cleanedPaths = pages.map((route) => {
        const path = route
            .replace("app", "")
            .replace(".tsx", "")
            .replace("page", "")
            .replace("/(footer)", "");
        const page = route === "/" ? "" : path;

        return page;
    });

    const routes = cleanedPaths
        .filter((path) => !ignoredRoutes.includes(path))
        .map((route) => {
            return {
                url: `https://therun.gg${route}`,
                lastModified: new Date().toISOString(),
            };
        });

    return routes;
}
