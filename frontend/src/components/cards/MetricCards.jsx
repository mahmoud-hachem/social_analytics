import {
    useEffect,
    useState,
} from "react"

import {
    MessagesSquare,
    Frown,
    MessageCircleWarning,
    ShieldAlert,
} from "lucide-react"

import MetricCard from "./MetricCard"

import {
    getSummary,
} from "../../api/analyticsApi"


function MetricCards({
    filters,
}) {
    const [
        summary,
        setSummary,
    ] = useState(null)

    const [
        loading,
        setLoading,
    ] = useState(true)

    const [
        error,
        setError,
    ] = useState(null)


    useEffect(() => {
        async function loadSummary() {
            try {
                setLoading(true)
                setError(null)

                const data =
                    await getSummary(
                        filters
                    )

                setSummary(data)

            } catch (err) {
                setError(err.message)

            } finally {
                setLoading(false)
            }
        }

        loadSummary()

    }, [filters])


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


    return (
        <section className="metric-grid">

            <MetricCard
                title="Total Content"
                value={
                    summary.total_content
                }
                subtitle={
                    filters.platform
                        ? filters.platform === "facebook"
                            ? "Facebook"
                            : "Instagram"
                        : "All Platforms"
                }
                icon={MessagesSquare}
            />


            <MetricCard
                title="Negative"
                value={
                    `${summary.negative_percentage}%`
                }
                subtitle="Negative sentiment"
                icon={Frown}
            />


            <MetricCard
                title="Complaints"
                value={
                    summary.complaints
                }
                subtitle="Detected complaints"
                icon={MessageCircleWarning}
            />


            <MetricCard
                title="High Severity"
                value={
                    summary.high_severity
                }
                subtitle="Needs attention"
                icon={ShieldAlert}
            />

        </section>
    )
}


export default MetricCards