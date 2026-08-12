function MetricCard({
    title,
    value,
    subtitle,
    icon: Icon,
}) {
    return (
        <div className="metric-card">

            <div className="metric-icon">
                <Icon size={24} />
            </div>

            <div className="metric-content">

                <span className="metric-title">
                    {title}
                </span>

                <strong className="metric-value">
                    {value}
                </strong>

                <span className="metric-subtitle">
                    {subtitle}
                </span>

            </div>

        </div>
    )
}

export default MetricCard