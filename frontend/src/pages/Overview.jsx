import { useState } from "react"
import FilterBar from "../components/filters/FilterBar"
import MetricCards from "../components/cards/MetricCards"
import SentimentDistributionChart from "../components/charts/SentimentDistributionChart"
import TopTopicsChart from "../components/charts/TopTopicsChart"

function Overview() {
    const [showFilters, setShowFilters] = useState(false)

    function handleToggleFilters() {
        setShowFilters(!showFilters)
    }

    return (
        <div className="overview-page">

            <header className="page-header">

                <div className="page-header-top">

                    <div className="page-header-text">
                        <h1>
                            Social Media Analytics Dashboard
                        </h1>

                    </div>

                    <button
                        className={`filter-toggle-btn ${showFilters ? "active" : ""}`}
                        onClick={handleToggleFilters}
                    >
                        <span className="filter-toggle-icon">
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M3 5H21"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                                <path
                                    d="M6 12H18"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                                <path
                                    d="M10 19H14"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </span>

                        <span>
                            Filters
                        </span>
                    </button>

                </div>

            </header>


            {showFilters && (
                <div className="filters-panel">
                    <FilterBar />
                </div>
            )}


            <MetricCards />

<section className="dashboard-charts">
    <SentimentDistributionChart />

    <TopTopicsChart />
</section>

        </div>
    )
}

export default Overview