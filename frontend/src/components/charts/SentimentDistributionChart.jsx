import {
    useEffect,
    useState,
} from "react"

import {
    PieChart,
    Pie,
    Tooltip,
    Sector,
} from "recharts"

import {
    getSentimentDistribution,
} from "../../api/analyticsApi.js"


const SENTIMENT_CONFIG = {
    positive: {
        label: "Positive",
        color: "#22c55e",
    },

    neutral: {
        label: "Neutral",
        color: "#94a3b8",
    },

    negative: {
        label: "Negative",
        color: "#ef4444",
    },
}


function renderSentimentSector(props) {
    const color =
        props.payload?.color
        ?? "#08a6b5"

    return (
        <Sector
            {...props}
            fill={color}
        />
    )
}


function SentimentDistributionChart() {
    const [data, setData] = useState(null)

    const [loading, setLoading] =
        useState(true)

    const [error, setError] =
        useState(null)


    useEffect(() => {
        async function loadSentiment() {
            try {
                const result =
                    await getSentimentDistribution()

                const formattedSentiments =
                    result.sentiments.map(
                        (item) => {
                            const config =
                                SENTIMENT_CONFIG[
                                    item.sentiment
                                ]

                            return {
                                ...item,

                                label:
                                    config.label,

                                color:
                                    config.color,
                            }
                        }
                    )

                setData({
                    total: result.total,
                    sentiments:
                        formattedSentiments,
                })

            } catch (err) {
                setError(err.message)

            } finally {
                setLoading(false)
            }
        }

        loadSentiment()
    }, [])


    if (loading) {
        return (
            <div className="chart-card">
                <div className="chart-status">
                    Loading sentiment data...
                </div>
            </div>
        )
    }


    if (error) {
        return (
            <div className="chart-card">
                <div className="chart-status chart-error">
                    {error}
                </div>
            </div>
        )
    }


    return (
        <div className="chart-card">

            <div className="chart-card-header">

                <div>
                    <h2>
                        Sentiment Distribution
                    </h2>

                    <p>
                        AI sentiment analysis across
                        social media platform content.
                    </p>
                </div>

            </div>


            <div className="sentiment-chart-content">

                <div className="sentiment-chart-wrapper">

                    <PieChart
                        width={260}
                        height={260}
                    >

                        <Pie
                            data={data.sentiments}
                            dataKey="count"
                            nameKey="label"

                            cx="50%"
                            cy="50%"

                            innerRadius={72}
                            outerRadius={105}

                            paddingAngle={2}

                            shape={
                                renderSentimentSector
                            }
                        />

                        <Tooltip
                            formatter={(
                                value,
                                name,
                                item,
                            ) => {
                                const percentage =
                                    item.payload
                                        .percentage

                                return [
                                    `${value} (${percentage}%)`,
                                    name,
                                ]
                            }}
                        />

                    </PieChart>


                    <div className="sentiment-chart-center">

                        <strong>
                            {data.total}
                        </strong>

                        <span>
                            Analyzed
                        </span>

                    </div>

                </div>


                <div className="sentiment-legend">

                    {data.sentiments.map(
                        (item) => (
                            <div
                                className="sentiment-legend-item"
                                key={item.sentiment}
                            >

                                <div className="sentiment-legend-left">

                                    <span
                                        className="sentiment-dot"
                                        style={{
                                            backgroundColor:
                                                item.color,
                                        }}
                                    />

                                    <span className="sentiment-name">
                                        {item.label}
                                    </span>

                                </div>


                                <div className="sentiment-values">

                                    <strong>
                                        {item.percentage}%
                                    </strong>

                                    <span>
                                        {item.count}
                                    </span>

                                </div>

                            </div>
                        )
                    )}

                </div>

            </div>

        </div>
    )
}


export default SentimentDistributionChart