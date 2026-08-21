// Generic nav shape for ConsoleChrome/ConsoleSidebar — game-agnostic so
// /settings can reuse the same chrome with its own item ids. Manage's
// `nav-model.ts` NavGroup/NavItem satisfy these structurally (NavItemId is a
// string union).
export interface NavItem {
    id: string;
    label: string;
    reserved?: boolean;
}

export interface NavGroup {
    id: string;
    label: string;
    items: NavItem[];
}
