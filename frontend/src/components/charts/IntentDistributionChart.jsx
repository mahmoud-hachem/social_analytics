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
    getIntents,
} from "../../api/analyticsApi.js"


function formatIntent(intent) {
    return intent
        .replaceAll("_", " ")
        .replace(
            /\b\w/g,
            (letter) =>
                letter.toUpperCase()
        )
}


function IntentDistributionChart({
    filters,
}) {
    const [
        intents,
        setIntents,
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
        async function loadIntents() {
            try {
                setLoading(true)
                setError(null)

                const data =
                    await getIntents(
                        filters
                    )

                const formatted =
                    data.intents
                        .slice(0, 6)
                        .map(
                            (item) => ({
                                ...item,

                                label:
                                    formatIntent(
                                        item.intent
                                    ),
                            })
                        )

                setIntents(formatted)

            } catch (err) {
                setError(err.message)

            } finally {
                setLoading(false)
            }
        }

        loadIntents()

    }, [filters])


    if (loading) {
        return (
            <div className="chart-card">
                <div className="chart-status">
                    Loading intents...
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
                        Intent Distribution
                    </h2>

                    <p>
                        Most common customer interaction intents.
                    </p>
                </div>

            </div>


            <div className="intent-chart">

                <ResponsiveContainer
                    width="100%"
                    height="100%"
                >

                    <BarChart
                        data={intents}
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
                            width={145}
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


export default IntentDistributionChart