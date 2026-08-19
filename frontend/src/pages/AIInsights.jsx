import {
    useEffect,
    useMemo,
    useState,
} from "react"

import {
    AlertTriangle,
    BrainCircuit,
    MessageCircleWarning,
    MessagesSquare,
    Sparkles,
} from "lucide-react"


const API_BASE =
    "http://127.0.0.1:8000"


function formatGeneratedAt(
    value
) {
    if (!value) {
        return "Not available"
    }

    const date =
        new Date(value)

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "Not available"
    }

    return date.toLocaleString()
}


function AIInsights() {
    const [
        insights,
        setInsights,
    ] = useState([])

    const [
        loading,
        setLoading,
    ] = useState(true)

    const [
        error,
        setError,
    ] = useState(null)


    useEffect(() => {
        async function loadInsights() {
            try {
                setLoading(true)
                setError(null)

                const response =
                    await fetch(
                        `${API_BASE}/api/ai-insights`
                    )


                if (!response.ok) {
                    throw new Error(
                        "Failed to load AI insights."
                    )
                }


                const data =
                    await response.json()


                setInsights(
                    Array.isArray(
                        data.insights
                    )
                        ? data.insights
                        : []
                )

            } catch (err) {
                setError(
                    err.message
                    || "Failed to load AI insights."
                )

            } finally {
                setLoading(false)
            }
        }


        loadInsights()

    }, [])


    const summary = useMemo(
        () => {
            return insights.reduce(
                (
                    result,
                    insight
                ) => {
                    result.totalItems +=
                        Number(
                            insight.total_items
                            || 0
                        )

                    result.negative +=
                        Number(
                            insight.negative_count
                            || 0
                        )

                    result.complaints +=
                        Number(
                            insight.complaint_count
                            || 0
                        )

                    result.highSeverity +=
                        Number(
                            insight.high_severity_count
                            || 0
                        )

                    return result
                },
                {
                    totalItems: 0,
                    negative: 0,
                    complaints: 0,
                    highSeverity: 0,
                }
            )
        },
        [insights]
    )


    if (loading) {
        return (
            <div className="ai-insights-page">

                <header className="ai-insights-header">
                    <div>
                        <h1>
                            AI Insights
                        </h1>

                    </div>
                </header>


                <div className="ai-insights-status">
                    Generating your insights view...
                </div>

            </div>
        )
    }


    if (error) {
        return (
            <div className="ai-insights-page">

                <header className="ai-insights-header">
                    <div>
                        <h1>
                            AI Insights
                        </h1>

                    </div>
                </header>


                <div className="ai-insights-status ai-insights-error">
                    {error}
                </div>

            </div>
        )
    }


    return (
        <div className="ai-insights-page">

            <header className="ai-insights-header">

                <div className="ai-insights-header-text">

                    <div className="ai-insights-title-row">

                        <div className="ai-insights-title-icon">
                            <BrainCircuit
                                size={25}
                            />
                        </div>

                        <h1>
                            AI Insights
                        </h1>

                    </div>



                </div>

            </header>


            {
                insights.length === 0
                    ? (
                        <section className="ai-insights-empty">

                            <div className="ai-insights-empty-icon">
                                <Sparkles
                                    size={27}
                                />
                            </div>

                            <h2>
                                No AI insights yet
                            </h2>

                            <p>
                                Collect and analyze social media content to generate topic insights.
                            </p>

                        </section>
                    )
                    : (
                        <>

                            <section className="ai-insights-summary">

                                <div className="ai-insights-summary-card">

                                    <div className="ai-insights-summary-icon">
                                        <Sparkles
                                            size={20}
                                        />
                                    </div>

                                    <div>
                                        <span>
                                            Topics
                                        </span>

                                        <strong>
                                            {
                                                insights.length
                                            }
                                        </strong>
                                    </div>

                                </div>


                                <div className="ai-insights-summary-card">

                                    <div className="ai-insights-summary-icon">
                                        <MessagesSquare
                                            size={20}
                                        />
                                    </div>

                                    <div>
                                        <span>
                                            Total Items
                                        </span>

                                        <strong>
                                            {
                                                summary.totalItems
                                            }
                                        </strong>
                                    </div>

                                </div>


                                <div className="ai-insights-summary-card">

                                    <div className="ai-insights-summary-icon warning">
                                        <MessageCircleWarning
                                            size={20}
                                        />
                                    </div>

                                    <div>
                                        <span>
                                            Complaints
                                        </span>

                                        <strong>
                                            {
                                                summary.complaints
                                            }
                                        </strong>
                                    </div>

                                </div>


                                <div className="ai-insights-summary-card">

                                    <div className="ai-insights-summary-icon danger">
                                        <AlertTriangle
                                            size={20}
                                        />
                                    </div>

                                    <div>
                                        <span>
                                            High Severity
                                        </span>

                                        <strong>
                                            {
                                                summary.highSeverity
                                            }
                                        </strong>
                                    </div>

                                </div>

                            </section>


                            <section className="ai-insights-section">

                                <div className="ai-insights-section-heading">

                                    <div>
                                        <h2>
                                            Topic Insights
                                        </h2>

                                        <p>
                                            What customers are saying and what deserves attention.
                                        </p>
                                    </div>


                                    <span className="ai-insights-topic-count">
                                        {
                                            insights.length
                                        }
                                        {
                                            insights.length === 1
                                                ? " topic"
                                                : " topics"
                                        }
                                    </span>

                                </div>


                                <div className="ai-insights-grid">

                                    {
                                        insights.map(
                                            (
                                                insight,
                                                index
                                            ) => {

                                                const total =
                                                    Number(
                                                        insight.total_items
                                                        || 0
                                                    )

                                                const negative =
                                                    Number(
                                                        insight.negative_count
                                                        || 0
                                                    )

                                                const complaints =
                                                    Number(
                                                        insight.complaint_count
                                                        || 0
                                                    )

                                                const highSeverity =
                                                    Number(
                                                        insight.high_severity_count
                                                        || 0
                                                    )


                                                return (
                                                    <article
                                                        key={
                                                            insight.topic
                                                        }
                                                        className="ai-topic-insight-card"
                                                    >

                                                        <div className="ai-topic-insight-top">

                                                            <div className="ai-topic-title-area">

                                                                <div className="ai-topic-rank">
                                                                    {
                                                                        index
                                                                        + 1
                                                                    }
                                                                </div>


                                                                <div>

                                                                    <span className="ai-topic-label">
                                                                        Topic Insight
                                                                    </span>

                                                                    <h3>
                                                                        {
                                                                            insight.title
                                                                        }
                                                                    </h3>

                                                                </div>

                                                            </div>


                                                            {
                                                                highSeverity > 0
                                                                && (
                                                                    <span className="ai-topic-attention-badge">

                                                                        <AlertTriangle
                                                                            size={14}
                                                                        />

                                                                        Attention

                                                                    </span>
                                                                )
                                                            }

                                                        </div>


                                                        <div className="ai-topic-insight-body">

                                                            <div className="ai-topic-sparkle">

                                                                <Sparkles
                                                                    size={19}
                                                                />

                                                            </div>


                                                            <p>
                                                                {
                                                                    insight.insight
                                                                }
                                                            </p>

                                                        </div>


                                                        <div className="ai-topic-stats">

                                                            <div className="ai-topic-stat">

                                                                <span>
                                                                    Items
                                                                </span>

                                                                <strong>
                                                                    {total}
                                                                </strong>

                                                            </div>


                                                            <div className="ai-topic-stat">

                                                                <span>
                                                                    Negative
                                                                </span>

                                                                <strong>
                                                                    {negative}
                                                                </strong>

                                                            </div>


                                                            <div className="ai-topic-stat">

                                                                <span>
                                                                    Complaints
                                                                </span>

                                                                <strong>
                                                                    {
                                                                        complaints
                                                                    }
                                                                </strong>

                                                            </div>


                                                            <div className="ai-topic-stat">

                                                                <span>
                                                                    High Severity
                                                                </span>

                                                                <strong>
                                                                    {
                                                                        highSeverity
                                                                    }
                                                                </strong>

                                                            </div>

                                                        </div>


                                                        <div className="ai-topic-footer">



                                                            <span>
                                                                {
                                                                    formatGeneratedAt(
                                                                        insight.generated_at
                                                                    )
                                                                }
                                                            </span>

                                                        </div>

                                                    </article>
                                                )
                                            }
                                        )
                                    }

                                </div>

                            </section>

                        </>
                    )
            }

        </div>
    )
}


export default AIInsights