import FilterSelect from "./FilterSelect"


function FilterBar() {

    const platformOptions = [
        {
            value: "facebook",
            label: "Facebook",
        },
        {
            value: "instagram",
            label: "Instagram",
        },
    ]


    const postTopicOptions = [
        {
            value: "new_service",
            label: "New Service",
        },
        {
            value: "new_feature",
            label: "New Feature",
        },
        {
            value: "new_offer_bundle",
            label: "New Offer / Bundle",
        },
        {
            value: "service_update",
            label: "Service Update",
        },
        {
            value: "network_upgrade",
            label: "Network Upgrade",
        },
        {
            value: "network_expansion",
            label: "Network Expansion",
        },
        {
            value: "network_maintenance",
            label: "Network Maintenance",
        },
        {
            value: "new_device",
            label: "New Device",
        },
        {
            value: "pricing_promotion",
            label: "Pricing Promotion",
        },
    ]


    const topicOptions = [
        {
            value: "network_coverage",
            label: "Network Coverage",
        },
        {
            value: "mobile_data_speed",
            label: "Mobile Data Speed",
        },
        {
            value: "network_outage",
            label: "Network Outage",
        },
        {
            value: "billing",
            label: "Billing",
        },
        {
            value: "balance_deduction",
            label: "Balance Deduction",
        },
        {
            value: "package_activation",
            label: "Package Activation",
        },
        {
            value: "package_renewal",
            label: "Package Renewal",
        },
        {
            value: "packages_offers",
            label: "Packages & Offers",
        },
        {
            value: "customer_service",
            label: "Customer Service",
        },
        {
            value: "mobile_application",
            label: "Mobile Application",
        },
        {
            value: "roaming",
            label: "Roaming",
        },
        {
            value: "pricing",
            label: "Pricing",
        },
        {
            value: "sim_card",
            label: "SIM Card",
        },
        {
            value: "router_device",
            label: "Router / Device",
        },
    ]


    const sentimentOptions = [
        {
            value: "positive",
            label: "Positive",
        },
        {
            value: "neutral",
            label: "Neutral",
        },
        {
            value: "negative",
            label: "Negative",
        },
    ]


    const intentOptions = [
        {
            value: "complaint",
            label: "Complaint",
        },
        {
            value: "question",
            label: "Question",
        },
        {
            value: "praise",
            label: "Praise",
        },
        {
            value: "suggestion",
            label: "Suggestion",
        },
        {
            value: "information_request",
            label: "Information Request",
        },
        {
            value: "confirmation",
            label: "Confirmation",
        },
        {
            value: "disagreement",
            label: "Disagreement",
        },
        {
            value: "follow_up",
            label: "Follow Up",
        },
        {
            value: "informational_response",
            label: "Informational Response",
        },
        {
            value: "mockery",
            label: "Mockery",
        },
    ]


    const severityOptions = [
        {
            value: "low",
            label: "Low",
        },
        {
            value: "medium",
            label: "Medium",
        },
        {
            value: "high",
            label: "High",
        },
    ]


    return (
        <section className="filter-bar">

            <div className="filter-group date-filter">

                <label className="filter-label">
                    Date From
                </label>

                <input
                    type="date"
                    className="filter-select"
                />

            </div>


            <div className="filter-group date-filter">

                <label className="filter-label">
                    Date To
                </label>

                <input
                    type="date"
                    className="filter-select"
                />

            </div>


            <FilterSelect
                label="Platform"
                options={platformOptions}
            />


            <FilterSelect
                label="Post Topic"
                options={postTopicOptions}
            />


            <FilterSelect
                label="Topic"
                options={topicOptions}
            />


            <FilterSelect
                label="Sentiment"
                options={sentimentOptions}
            />


            <FilterSelect
                label="Intent"
                options={intentOptions}
            />


            <FilterSelect
                label="Severity"
                options={severityOptions}
            />

        </section>
    )
}


export default FilterBar