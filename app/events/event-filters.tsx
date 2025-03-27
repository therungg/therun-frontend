"use client";

export const EventFilters = () => {
    return (
        <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
                <span className="me-2">Filter by:</span>
                <button className="btn btn-outline-primary">All</button>
                <button className="btn btn-outline-primary">Today</button>
                <button className="btn btn-outline-primary">This Week</button>
                <button className="btn btn-outline-primary">This Month</button>
            </div>
            <div>
                <button className="btn btn-primary">Create Event</button>
            </div>
        </div>
    );
};
