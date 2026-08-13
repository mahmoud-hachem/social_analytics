import {
    useEffect,
    useState,
} from "react"

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts"

import {
    getSentimentOverTime,
} from "../../api/analyticsApi.js"


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


function CommentsSentimentOverTime({
    filters,
}) {
    const [
        data,
        setData,
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
        async function loadData() {
            try {
                setLoading(true)
                setError(null)

                const result =
                    await getSentimentOverTime(
                        filters
                    )

                const formatted =
                    result.data.map(
                        (item) => ({
                            ...item,

                            label:
                                formatDate(
                                    item.date
                                ),
                        })
                    )

                setData(formatted)

            } catch (err) {
                setError(err.message)

            } finally {
                setLoading(false)
            }
        }

        loadData()

    }, [filters])


    if (loading) {
        return (
            <div className="overview-wide-card">
                <div className="chart-status">
                    Loading sentiment trend...
                </div>
            </div>
        )
    }


    if (error) {
        return (
            <div className="overview-wide-card">
                <div className="chart-status chart-error">
                    {error}
                </div>
            </div>
        )
    }


    return (
        <div className="overview-wide-card">

            <div className="wide-card-header">

                <div>
                    <h2>
                        Comments & Sentiment Over Time
                    </h2>

                    <p>
                        Daily content volume and sentiment trends.
                    </p>
                </div>

            </div>


            <div className="sentiment-time-chart">

                <ResponsiveContainer
                    width="100%"
                    height="100%"
                >

                    <LineChart
                        data={data}

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
                            dataKey="total"
                            name="Total Content"
                            stroke="#08a6b5"
                            strokeWidth={3}

                            dot={{
                                r: 4,
                            }}
                        />

                        <Line
                            type="monotone"
                            dataKey="positive"
                            name="Positive"
                            stroke="#22c55e"
                            strokeWidth={2}
                        />

                        <Line
                            type="monotone"
                            dataKey="neutral"
                            name="Neutral"
                            stroke="#94a3b8"
                            strokeWidth={2}
                        />

                        <Line
                            type="monotone"
                            dataKey="negative"
                            name="Negative"
                            stroke="#ef4444"
                            strokeWidth={2}
                        />

                    </LineChart>

                </ResponsiveContainer>

            </div>

        </div>
    )
}


export default CommentsSentimentOverTime