// Re-export of the root profile route. A game may take a name at the site
// root, so every profile is also reachable here, and userHref() points
// in-site links at this form.
// See docs/plans/2026-09-11-root-game-slugs-design.md.
export {
    default,
    generateMetadata,
} from '~app/(new-layout)/[username]/[game]/[run]/page';
