import Switch from "react-switch";

export const GametimeForm = ({ useGameTime, setUseGameTime }) => {
    return (
        <div className={"gametime-form-container"}>
            <label htmlFor={"switch"} className={"gametime-form-label"}>
                {useGameTime ? "Using Ingame Time (IGT)" : "Using Real Time"}
            </label>
            <Switch
                name={"switch"}
                onChange={(checked) => {
                    setUseGameTime(checked);
                }}
                checked={useGameTime}
            />
        </div>
    );
};
