import { AutoCompletion } from "./search/autocompletion";
import styles from "./css/Search.module.scss";

export const Search = () => {
    return (
        <div className={styles.searchContainer}>
            <div
                className="row height d-flex justify-content-center align-items-center"
                style={{ marginRight: "0rem" }}
            >
                <div className="col-md-16">
                    <div className={`search${styles.search}`}>
                        <i className={styles.search} />
                        <AutoCompletion />
                    </div>
                </div>
            </div>
        </div>
    );
};
