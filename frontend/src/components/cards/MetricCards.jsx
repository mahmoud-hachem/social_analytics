import {
    useEffect,
    useState,
} from "react"

import {
    MessagesSquare,
    Sparkles,
} from "lucide-react"

import MetricCard from "./MetricCard"

import {
    getSummary,
} from "../../api/analyticsApi"


const API_BASE =
    "http://127.0.0.1:8000"


function MetricCards({
    filters,
}) {
    const [
        summary,
        setSummary,
    ] = useState(null)

    const [
        insights,
        setInsights,
    ] = useState([])

    const [
        activeInsight,
        setActiveInsight,
    ] = useState(0)

    const [
        loading,
        setLoading,
    ] = useState(true)

    const [
        error,
        setError,
    ] = useState(null)


    useEffect(() => {
        async function loadOverviewData() {
            try {
                setLoading(true)
                setError(null)

                const [
                    summaryData,
                    insightsResponse,
                ] = await Promise.all([
                    getSummary(filters),

                    fetch(
                        `${API_BASE}/api/ai-insights/overview`
                    ),
                ])


                if (
                    !insightsResponse.ok
                ) {
                    throw new Error(
                        "Failed to load AI insights."
                    )
                }


                const insightsData =
                    await insightsResponse.json()


                setSummary(
                    summaryData
                )

                setInsights(
                    Array.isArray(
                        insightsData.insights
                    )
                        ? insightsData.insights
                        : []
                )

                setActiveInsight(0)

            } catch (err) {
                setError(
                    err.message
                    || "Failed to load overview."
                )

            } finally {
                setLoading(false)
            }
        }


        loadOverviewData()

    }, [filters])


    useEffect(() => {
        if (
            insights.length <= 1
        ) {
            return undefined
        }


        const interval =
            window.setInterval(
                () => {
                    setActiveInsight(
                        (
                            current
                        ) =>
                            (
                                current + 1
                            )
                            % insights.length
                    )
                },
                6500
            )


        return () => {
            window.clearInterval(
                interval
            )
        }

    }, [insights])


    if (loading) {
        return (
            <div className="metric-status">
                Loading dashboard data...
            </div>
        )
    }


    if (error) {
        return (
            <div className="metric-status metric-error">
                {error}
            </div>
        )
    }


    const currentInsight =
        insights[
            activeInsight
        ]
        || null


    return (
        <section className="overview-summary-grid">

            <MetricCard
                title="Total Content"
                value={
                    summary
                        ?.total_content
                    || 0
                }
                subtitle={
                    filters.platform
                        ? (
                            filters.platform
                            === "facebook"
                        )
                            ? "Facebook"
                            : "Instagram"
                        : "All Platforms"
                }
                icon={
                    MessagesSquare
                }
            />


            <article className="ai-insight-overview-card">

                <div className="ai-insight-overview-icon">
                    <Sparkles
                        size={24}
                    />
                </div>


                <div className="ai-insight-overview-content">

                    <div className="ai-insight-overview-heading">

                        <span>
                            AI Insight
                        </span>


                        {
                            insights.length > 0
                            && (
                                <span className="ai-insight-overview-number">
                                    {
                                        activeInsight
                                        + 1
                                    }
                                    /
                                    {
                                        insights.length
                                    }
                                </span>
                            )
                        }

                    </div>


                    {
                        currentInsight
                            ? (
                                <div
                                    key={
                                        `${currentInsight.topic}-${activeInsight}`
                                    }
                                    className="ai-insight-overview-slide"
                                >

                                    <h3>
                                        {
                                            currentInsight.title
                                        }
                                    </h3>


                                    <p>
                                        {
                                            currentInsight.insight
                                        }
                                    </p>

                                </div>
                            )
                            : (
                                <div className="ai-insight-overview-slide">

                                    <h3>
                                        No AI insights yet
                                    </h3>


                                    <p>
                                        Collect and analyze content to generate topic insights.
                                    </p>

                                </div>
                            )
                    }


                    {
                        insights.length > 1
                        && (
                            <div className="ai-insight-overview-dots">

                                {
                                    insights.map(
                                        (
                                            insight,
                                            index
                                        ) => (
                                            <button
                                                key={
                                                    insight.topic
                                                }
                                                type="button"
                                                className={
                                                    `ai-insight-dot ${
                                                        index
                                                        === activeInsight
                                                            ? "active"
                                                            : ""
                                                    }`
                                                }
                                                onClick={
                                                    () =>
                                                        setActiveInsight(
                                                            index
                                                        )
                                                }
                                                aria-label={
                                                    `Show ${
                                                        insight.title
                                                    } insight`
                                                }
                                            />
                                        )
                                    )
                                }

                            </div>
                        )
                    }

                </div>

            </article>

        </section>
    )
}


export default MetricCards