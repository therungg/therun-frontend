import { useState } from "react";
import { Button } from "react-bootstrap";

export const BanUser = ({ tournament, session }) => {
    const [bannedUser, setBannedUser] = useState("");

    const users = tournament.ineligibleUsers || [];

    return (
        <div>
            <h2>Currently banned users</h2>
            <div>
                {users.map((user) => {
                    return <div key={user}>{user}</div>;
                })}
            </div>
            <div>
                <h2>Ban user</h2>
                Input User to ban:
                <input
                    type="text"
                    className="form-control"
                    value={bannedUser}
                    style={{ width: "20rem" }}
                    onChange={(e) => {
                        setBannedUser(e.target.value);
                    }}
                ></input>
                <Button
                    variant="primary"
                    style={{ marginTop: "1rem" }}
                    onClick={async () => {
                        if (
                            confirm(
                                `Are you sure you want to ban ${bannedUser}?`,
                            )
                        ) {
                            const user = `${session.id}-${bannedUser}`;

                            await fetch(
                                `/api/tournaments/${tournament.name}/removeUser/${user}`,
                                {
                                    method: "GET",
                                },
                            );
                        }
                    }}
                >
                    Ban {bannedUser}
                </Button>
            </div>
        </div>
    );
};

export default BanUser;
