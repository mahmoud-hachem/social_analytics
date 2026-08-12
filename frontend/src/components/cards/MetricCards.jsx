import {
    MessagesSquare,
    Frown,
    MessageCircleWarning,
    ShieldAlert,
} from "lucide-react"

import MetricCard from "./MetricCard"


function MetricCards() {
    return (
        <section className="metric-grid">

            <MetricCard
                title="Total Content"
                value="53"
                subtitle="Facebook + Instagram"
                icon={MessagesSquare}
            />

            <MetricCard
                title="Negative"
                value="41%"
                subtitle="Negative sentiment"
                icon={Frown}
            />

            <MetricCard
                title="Complaints"
                value="24"
                subtitle="Detected complaints"
                icon={MessageCircleWarning}
            />

            <MetricCard
                title="High Severity"
                value="9"
                subtitle="Needs attention"
                icon={ShieldAlert}
            />

        </section>
    )
}


export default MetricCards