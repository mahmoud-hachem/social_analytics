import FilterSelect from "./FilterSelect"


function FilterBar({
    filters,
    onFilterChange,
}) {
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
            value: "prepaid_sim",
            label: "Prepaid SIM",
        },
        {
            value: "app_digital_feature",
            label: "App / Digital Feature",
        },
        {
            value: "roaming_service",
            label: "Roaming Service",
        },
        {
            value: "esim_service",
            label: "eSIM Service",
        },
        {
            value: "customer_service_update",
            label: "Customer Service Update",
        },
        {
            value: "pricing_promotion",
            label: "Pricing Promotion",
        },
        {
            value: "availability_announcement",
            label: "Availability Announcement",
        },
        {
            value: "how_to_guide",
            label: "How-To Guide",
        },
        {
            value: "company_announcement",
            label: "Company Announcement",
        },
        {
            value: "event_campaign",
            label: "Event / Campaign",
        },
        {
            value: "general_information",
            label: "General Information",
        },
        {
            value: "other",
            label: "Other",
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
            value: "customer_service",
            label: "Customer Service",
        },
        {
            value: "mobile_application",
            label: "Mobile Application",
        },
        {
            value: "packages_offers",
            label: "Packages & Offers",
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
        {
            value: "other",
            label: "Other",
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
            value: "general_opinion",
            label: "General Opinion",
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
                    value={filters.dateFrom}
                    onChange={(event) =>
                        onFilterChange(
                            "dateFrom",
                            event.target.value
                        )
                    }
                />

            </div>


            <div className="filter-group date-filter">

                <label className="filter-label">
                    Date To
                </label>

                <input
                    type="date"
                    className="filter-select"
                    value={filters.dateTo}
                    onChange={(event) =>
                        onFilterChange(
                            "dateTo",
                            event.target.value
                        )
                    }
                />

            </div>


            <FilterSelect
                label="Platform"
                options={platformOptions}
                value={filters.platform}
                onChange={(value) =>
                    onFilterChange(
                        "platform",
                        value
                    )
                }
            />


            <FilterSelect
                label="Post Topic"
                options={postTopicOptions}
                value={filters.postTopic}
                onChange={(value) =>
                    onFilterChange(
                        "postTopic",
                        value
                    )
                }
            />


            <FilterSelect
                label="Topic"
                options={topicOptions}
                value={filters.topic}
                onChange={(value) =>
                    onFilterChange(
                        "topic",
                        value
                    )
                }
            />


            <FilterSelect
                label="Sentiment"
                options={sentimentOptions}
                value={filters.sentiment}
                onChange={(value) =>
                    onFilterChange(
                        "sentiment",
                        value
                    )
                }
            />


            <FilterSelect
                label="Intent"
                options={intentOptions}
                value={filters.intent}
                onChange={(value) =>
                    onFilterChange(
                        "intent",
                        value
                    )
                }
            />


            <FilterSelect
                label="Severity"
                options={severityOptions}
                value={filters.severity}
                onChange={(value) =>
                    onFilterChange(
                        "severity",
                        value
                    )
                }
            />

        </section>
    )
}


export default FilterBar