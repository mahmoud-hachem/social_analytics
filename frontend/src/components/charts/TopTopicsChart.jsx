import {
    useEffect,
    useState,
} from "react"

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts"

import {
    getTopics,
} from "../../api/analyticsApi.js"


function formatTopic(topic) {
    return topic
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) =>
            letter.toUpperCase()
        )
}


function TopTopicsChart() {
    const [topics, setTopics] = useState([])

    const [loading, setLoading] =
        useState(true)

    const [error, setError] =
        useState(null)


    useEffect(() => {
        async function loadTopics() {
            try {
                const data = await getTopics()

                const formatted =
                    data.topics
                        .slice(0, 6)
                        .map((item) => ({
                            ...item,
                            label:
                                formatTopic(
                                    item.topic
                                ),
                        }))

                setTopics(formatted)

            } catch (err) {
                setError(err.message)

            } finally {
                setLoading(false)
            }
        }

        loadTopics()
    }, [])


    if (loading) {
        return (
            <div className="chart-card">
                <div className="chart-status">
                    Loading topics...
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
                        Top Topics
                    </h2>

                    <p>
                        Most discussed customer topics.
                    </p>
                </div>

            </div>


            <div className="topics-chart">

                <ResponsiveContainer
                    width="100%"
                    height="100%"
                >

                    <BarChart
                        data={topics}
                        layout="vertical"
                        margin={{
                            top: 8,
                            right: 20,
                            bottom: 8,
                            left: 20,
                        }}
                    >

                        <XAxis
                            type="number"
                            allowDecimals={false}
                            axisLine={false}
                            tickLine={false}
                        />

                        <YAxis
                            type="category"
                            dataKey="label"
                            width={130}
                            axisLine={false}
                            tickLine={false}
                        />

                        <Tooltip />

                        <Bar
                            dataKey="count"
                            fill="#08a6b5"
                            radius={[
                                0,
                                8,
                                8,
                                0,
                            ]}
                            barSize={20}
                        />

                    </BarChart>

                </ResponsiveContainer>

            </div>

        </div>
    )
}


export default TopTopicsChart