export interface User {
    id: string;
    username: string;
    picture: string;
}

export interface Session {
    user: User;
    theme: "light" | "dark";
}
