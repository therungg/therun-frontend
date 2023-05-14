import { Options } from "react-use-websocket";

const options: Options = {
    // eslint-disable-next-line no-unused-vars
    shouldReconnect: (_) => true,
    reconnectAttempts: Number.MAX_SAFE_INTEGER,
    reconnectInterval: 2000,
};

export default options;
