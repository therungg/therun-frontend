export default function NewsCard({ title, timestamp, description }) {
    return (
        <div className="d-flex flex-column gap-2 p-2">
            <div className="d-flex align-items-center justify-content-between">
                <h3 className="text-light opacity-90 fs-6 fw-semibold">
                    {title}
                </h3>
                <span className="text-light opacity-60 small">{timestamp}</span>
            </div>
            <p className="text-light opacity-70 small">{description}</p>
        </div>
    );
}
