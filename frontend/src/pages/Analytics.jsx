import {
    useEffect,
    useState,
} from "react"

import {
    LineChart,
    Line,
    PieChart,
    Pie,
    Sector,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts"

import {
    getAnalyticsVolumeOverTime,
    getAnalyticsIssuesOverTime,
    getAnalyticsTopicDistribution,
    getAnalyticsTopicSeverity,
    getAnalyticsEngagementByPlatform,
    getAnalyticsTopicsToWorkOn,
} from "../api/analyticsApi.js"

import facebookLogo
    from "../assets/facebook-logo.png"

import instagramLogo
    from "../assets/instagram-logo.png"


const PLATFORM_LOGOS = {
    facebook: facebookLogo,
    instagram: instagramLogo,
}


const TOPIC_COLORS = [
    "#08a6b5",
    "#2563eb",
    "#7c3aed",
    "#f59e0b",
    "#ef4444",
    "#22c55e",
]


function formatDate(date) {
    return new Date(
        `${date}T00:00:00`
    ).toLocaleDateString(
        "en-US",
        {
            month: "short",
            day: "numeric",
        }
    )
}


function formatLabel(value) {
    if (!value) {
        return "-"
    }

    return value
        .replaceAll("_", " ")
        .replace(
            /\b\w/g,
            (letter) =>
                letter.toUpperCase()
        )
}


function renderTopicSector(props) {
    return (
        <Sector
            {...props}
            fill={
                props.payload?.color
            }
        />
    )
}


function Analytics() {
    const [
        volumeData,
        setVolumeData,
    ] = useState([])

    const [
        issuesData,
        setIssuesData,
    ] = useState([])

    const [
        topicData,
        setTopicData,
    ] = useState({
        total: 0,
        topics: [],
    })

    const [
        topicSeverity,
        setTopicSeverity,
    ] = useState([])

    const [
        platformEngagement,
        setPlatformEngagement,
    ] = useState({
        total: 0,
        platforms: [],
    })

    const [
        priorityTopics,
        setPriorityTopics,
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
        async function loadAnalytics() {
            try {
                setLoading(true)
                setError(null)

                const [
                    volumeResult,
                    issuesResult,
                    topicResult,
                    severityResult,
                    platformResult,
                    priorityResult,
                ] = await Promise.all([
                    getAnalyticsVolumeOverTime(),
                    getAnalyticsIssuesOverTime(),
                    getAnalyticsTopicDistribution(),
                    getAnalyticsTopicSeverity(),
                    getAnalyticsEngagementByPlatform(),
                    getAnalyticsTopicsToWorkOn(),
                ])


                setVolumeData(
                    volumeResult.data.map(
                        (item) => ({
                            ...item,

                            label:
                                formatDate(
                                    item.date
                                ),
                        })
                    )
                )


                setIssuesData(
                    issuesResult.data.map(
                        (item) => ({
                            ...item,

                            label:
                                formatDate(
                                    item.date
                                ),
                        })
                    )
                )


                const formattedTopics =
                    topicResult.topics
                        .slice(0, 6)
                        .map(
                            (
                                item,
                                index,
                            ) => ({
                                ...item,

                                label:
                                    formatLabel(
                                        item.topic
                                    ),

                                color:
                                    TOPIC_COLORS[
                                        index
                                    ],
                            })
                        )


                setTopicData({
                    total:
                        topicResult.total,

                    topics:
                        formattedTopics,
                })


                setTopicSeverity(
                    severityResult.topics
                        .slice(0, 8)
                        .map(
                            (item) => ({
                                ...item,

                                label:
                                    formatLabel(
                                        item.topic
                                    ),
                            })
                        )
                )


                setPlatformEngagement(
                    platformResult
                )


                setPriorityTopics(
                    priorityResult.topics
                )

            } catch (err) {
                setError(
                    err.message
                )

            } finally {
                setLoading(false)
            }
        }

        loadAnalytics()

    }, [])


    if (loading) {
        return (
            <div className="analytics-status">
                Loading analytics...
            </div>
        )
    }


    if (error) {
        return (
            <div className="analytics-status analytics-error">
                {error}
            </div>
        )
    }


    return (
        <div className="analytics-page">

            <header className="analytics-page-header">

                <h1>
                    Analytics
                </h1>


            </header>


            {/* =====================================================
                ROW 1
            ===================================================== */}

            <div className="analytics-insight-row">

                <section className="analytics-main-card">

                    <div className="analytics-card-header">

                        <h2>
                            Volume Over Time
                        </h2>

                        <p>
                            Daily analyzed customer interactions.
                        </p>

                    </div>


                    <div className="analytics-line-chart">

                        <ResponsiveContainer
                            width="100%"
                            height="100%"
                        >

                            <LineChart
                                data={volumeData}
                                margin={{
                                    top: 15,
                                    right: 25,
                                    bottom: 5,
                                    left: 0,
                                }}
                            >

                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                />

                                <XAxis
                                    dataKey="label"
                                    axisLine={false}
                                    tickLine={false}
                                />

                                <YAxis
                                    allowDecimals={false}
                                    axisLine={false}
                                    tickLine={false}
                                />

                                <Tooltip />

                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    name="Interactions"
                                    stroke="#08a6b5"
                                    strokeWidth={3}
                                    dot={{
                                        r: 4,
                                    }}
                                    activeDot={{
                                        r: 6,
                                    }}
                                />

                            </LineChart>

                        </ResponsiveContainer>

                    </div>

                </section>


                {/* ENGAGEMENT BY PLATFORM */}

                <section className="analytics-side-card">

                    <div className="analytics-card-header">

                        <h2>
                            Engagement by Platform
                        </h2>

                        <p>
                            Compare which platform
                            generates the most interaction.
                        </p>

                    </div>


                    <div className="platform-engagement-list">

                        {
                            platformEngagement.platforms.map(
                                (item) => (
                                    <div
                                        className="platform-engagement-item"
                                        key={
                                            item.platform
                                        }
                                    >

                                        <div className="engagement-platform-top">

                                            <div className="engagement-platform-name">

                                                <img
                                                    src={
                                                        PLATFORM_LOGOS[
                                                            item.platform
                                                        ]
                                                    }
                                                    alt={
                                                        item.platform
                                                    }
                                                />

                                                <span>
                                                    {
                                                        formatLabel(
                                                            item.platform
                                                        )
                                                    }
                                                </span>

                                            </div>


                                            <strong>
                                                {
                                                    item.count
                                                }
                                            </strong>

                                        </div>


                                        <div className="engagement-meta">

                                            <span>
                                                {
                                                    item.percentage
                                                }%
                                            </span>

                                            <span>
                                                interactions
                                            </span>

                                        </div>


                                        <div className="engagement-progress">

                                            <div
                                                className="engagement-progress-fill"
                                                style={{
                                                    width:
                                                        `${item.percentage}%`,
                                                }}
                                            />

                                        </div>

                                    </div>
                                )
                            )
                        }

                    </div>


                    <div className="engagement-total">

                        <span>
                            Total interactions
                        </span>

                        <strong>
                            {
                                platformEngagement.total
                            }
                        </strong>

                    </div>

                </section>

            </div>


            {/* =====================================================
                ROW 2
            ===================================================== */}

            <div className="analytics-insight-row">

                <section className="analytics-main-card">

                    <div className="analytics-card-header">

                        <h2>
                            Complaints & High Severity Over Time
                        </h2>

                        <p>
                            Daily complaint and serious issue trends.
                        </p>

                    </div>


                    <div className="analytics-line-chart">

                        <ResponsiveContainer
                            width="100%"
                            height="100%"
                        >

                            <LineChart
                                data={issuesData}
                                margin={{
                                    top: 15,
                                    right: 25,
                                    bottom: 5,
                                    left: 0,
                                }}
                            >

                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                />

                                <XAxis
                                    dataKey="label"
                                    axisLine={false}
                                    tickLine={false}
                                />

                                <YAxis
                                    allowDecimals={false}
                                    axisLine={false}
                                    tickLine={false}
                                />

                                <Tooltip />

                                <Legend />

                                <Line
                                    type="monotone"
                                    dataKey="complaints"
                                    name="Complaints"
                                    stroke="#f59e0b"
                                    strokeWidth={3}
                                    dot={{
                                        r: 4,
                                    }}
                                />

                                <Line
                                    type="monotone"
                                    dataKey="high_severity"
                                    name="High Severity"
                                    stroke="#ef4444"
                                    strokeWidth={3}
                                    dot={{
                                        r: 4,
                                    }}
                                />

                            </LineChart>

                        </ResponsiveContainer>

                    </div>

                </section>


                {/* TOPICS TO WORK ON */}

                <section className="analytics-side-card">

                    <div className="analytics-card-header">

                        <h2>
                            Topics to Work On
                        </h2>

                        <p>
                            Topics with the highest
                            complaint and severity pressure.
                        </p>

                    </div>


                    <div className="priority-topic-list">

                        {
                            priorityTopics.map(
                                (
                                    item,
                                    index,
                                ) => (
                                    <div
                                        className="priority-topic-item"
                                        key={
                                            item.topic
                                        }
                                    >

                                        <div className="priority-topic-rank">
                                            {
                                                index + 1
                                            }
                                        </div>


                                        <div className="priority-topic-content">

                                            <div className="priority-topic-top">

                                                <strong>
                                                    {
                                                        formatLabel(
                                                            item.topic
                                                        )
                                                    }
                                                </strong>


                                                <span
                                                    className={
                                                        `priority-badge priority-${item.priority}`
                                                    }
                                                >
                                                    {
                                                        formatLabel(
                                                            item.priority
                                                        )
                                                    }
                                                </span>

                                            </div>


                                            <div className="priority-topic-stats">

                                                <span>
                                                    {
                                                        item.complaints
                                                    } complaints
                                                </span>

                                                <span>
                                                    {
                                                        item.high_severity
                                                    } high severity
                                                </span>

                                            </div>

                                        </div>

                                    </div>
                                )
                            )
                        }

                    </div>

                </section>

            </div>


            {/* =====================================================
                EXISTING TOPIC ROW
            ===================================================== */}

            <div className="analytics-topic-grid">


                <section className="analytics-topic-card">

                    <div className="analytics-card-header">

                        <h2>
                            Topic Distribution
                        </h2>

                        <p>
                            Most discussed customer topics.
                        </p>

                    </div>


                    <div className="topic-distribution-content">

                        <div className="topic-donut-wrapper">

                            <PieChart
                                width={300}
                                height={300}
                            >

                                <Pie
                                    data={
                                        topicData.topics
                                    }
                                    dataKey="count"
                                    nameKey="label"

                                    cx="50%"
                                    cy="50%"

                                    innerRadius={88}
                                    outerRadius={125}

                                    paddingAngle={2}

                                    shape={
                                        renderTopicSector
                                    }
                                />

                                <Tooltip />

                            </PieChart>


                            <div className="topic-donut-center">

                                <strong>
                                    {
                                        topicData.total
                                    }
                                </strong>

                                <span>
                                    Total
                                </span>

                            </div>

                        </div>


                        <div className="topic-distribution-legend">

                            {
                                topicData.topics.map(
                                    (item) => (
                                        <div
                                            className="topic-legend-item"
                                            key={
                                                item.topic
                                            }
                                        >

                                            <div className="topic-legend-left">

                                                <span
                                                    className="topic-legend-dot"
                                                    style={{
                                                        backgroundColor:
                                                            item.color,
                                                    }}
                                                />

                                                <span>
                                                    {
                                                        item.label
                                                    }
                                                </span>

                                            </div>


                                            <strong>
                                                {
                                                    item.percentage
                                                }%
                                            </strong>

                                        </div>
                                    )
                                )
                            }

                        </div>

                    </div>

                </section>


                <section className="analytics-topic-card">

                    <div className="analytics-card-header">

                        <h2>
                            Topic Severity
                        </h2>

                        <p>
                            Warmer cells represent
                            more serious customer issues.
                        </p>

                    </div>


                    <div className="topic-heatmap">

                        <div className="heatmap-header">

                            <span>
                                Topic
                            </span>

                            <span>
                                Low
                            </span>

                            <span>
                                Medium
                            </span>

                            <span>
                                High
                            </span>

                        </div>


                        {
                            topicSeverity.map(
                                (item) => (
                                    <div
                                        className="heatmap-row"
                                        key={
                                            item.topic
                                        }
                                    >

                                        <span className="heatmap-topic">
                                            {
                                                item.label
                                            }
                                        </span>


                                        <div className="heatmap-cell heatmap-low">
                                            {
                                                item.low
                                            }
                                        </div>


                                        <div className="heatmap-cell heatmap-medium">
                                            {
                                                item.medium
                                            }
                                        </div>


                                        <div className="heatmap-cell heatmap-high">
                                            {
                                                item.high
                                            }
                                        </div>

                                    </div>
                                )
                            )
                        }

                    </div>

                </section>

            </div>

        </div>
    )
}


export default Analytics