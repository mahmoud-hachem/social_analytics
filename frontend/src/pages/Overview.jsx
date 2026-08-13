import {
    useState,
} from "react"

import {
    RotateCcw,
    Save,
    SlidersHorizontal,
} from "lucide-react"

import FilterBar
    from "../components/filters/FilterBar"

import MetricCards
    from "../components/cards/MetricCards"

import SentimentDistributionChart
    from "../components/charts/SentimentDistributionChart"

import TopTopicsChart
    from "../components/charts/TopTopicsChart"

import IntentDistributionChart
    from "../components/charts/IntentDistributionChart"

import PlatformDistribution
    from "../components/charts/PlatformDistribution"

import CommentsSentimentOverTime
    from "../components/charts/CommentsSentimentOverTime"

import HighSeverityTable
    from "../components/tables/HighSeverityTable"

import CommentsAnalysisTable
    from "../components/tables/CommentsAnalysisTable"


const EMPTY_FILTERS = {
    dateFrom: "",
    dateTo: "",
    platform: "",
    postTopic: "",
    topic: "",
    sentiment: "",
    intent: "",
    severity: "",
}


function Overview() {
    const [
        showFilters,
        setShowFilters,
    ] = useState(false)

    const [
        draftFilters,
        setDraftFilters,
    ] = useState(EMPTY_FILTERS)

    const [
        appliedFilters,
        setAppliedFilters,
    ] = useState(EMPTY_FILTERS)


    function handleToggleFilters() {
        if (!showFilters) {
            setDraftFilters(
                appliedFilters
            )
        }

        setShowFilters(
            !showFilters
        )
    }


    function handleFilterChange(
        name,
        value,
    ) {
        setDraftFilters(
            (currentFilters) => ({
                ...currentFilters,
                [name]: value,
            })
        )
    }


    function handleSaveFilters() {
        setAppliedFilters({
            ...draftFilters,
        })

        setShowFilters(false)
    }


    function handleResetFilters() {
        setDraftFilters({
            ...EMPTY_FILTERS,
        })

        setAppliedFilters({
            ...EMPTY_FILTERS,
        })

        setShowFilters(false)
    }


    const hasAppliedFilters =
        Object.values(
            appliedFilters
        ).some(
            (value) => value !== ""
        )


    return (
        <div className="overview-page">

            <header className="page-header">

                <div className="page-header-top">

                    <div className="page-header-text">

                        <h1>
                            Social Media Analytics Dashboard
                        </h1>

                    </div>


                    <div className="header-filter-actions">

                        {showFilters ? (
                            <>
                                <button
                                    className="filter-action-btn reset-filter-btn"
                                    onClick={
                                        handleResetFilters
                                    }
                                >
                                    <RotateCcw
                                        size={18}
                                    />

                                    <span>
                                        Reset
                                    </span>
                                </button>


                                <button
                                    className="filter-action-btn save-filter-btn"
                                    onClick={
                                        handleSaveFilters
                                    }
                                >
                                    <Save
                                        size={18}
                                    />

                                    <span>
                                        Save
                                    </span>
                                </button>
                            </>
                        ) : (
                            <>
                                {hasAppliedFilters && (
                                    <button
                                        className="filter-action-btn reset-filter-btn"
                                        onClick={
                                            handleResetFilters
                                        }
                                    >
                                        <RotateCcw
                                            size={18}
                                        />

                                        <span>
                                            Reset
                                        </span>
                                    </button>
                                )}


                                <button
                                    className="filter-toggle-btn"
                                    onClick={
                                        handleToggleFilters
                                    }
                                >
                                    <SlidersHorizontal
                                        size={18}
                                    />

                                    <span>
                                        Filters
                                    </span>
                                </button>
                            </>
                        )}

                    </div>

                </div>

            </header>


            {showFilters && (
                <div className="filters-panel">

                    <FilterBar
                        filters={
                            draftFilters
                        }
                        onFilterChange={
                            handleFilterChange
                        }
                    />

                </div>
            )}


            <MetricCards
                filters={appliedFilters}
            />


            <section className="dashboard-charts">

                <SentimentDistributionChart
                    filters={appliedFilters}
                />

                <TopTopicsChart
                    filters={appliedFilters}
                />

            </section>


            <section className="dashboard-charts">

                <PlatformDistribution
                    filters={appliedFilters}
                />

                <IntentDistributionChart
                    filters={appliedFilters}
                />

            </section>


            <section className="overview-full-row">

                <CommentsSentimentOverTime
                    filters={appliedFilters}
                />

            </section>


            <section className="overview-full-row">

                <HighSeverityTable
                    filters={appliedFilters}
                />

            </section>


            <section className="overview-full-row">

                <CommentsAnalysisTable
                    filters={appliedFilters}
                />

            </section>

        </div>
    )
}


export default Overview