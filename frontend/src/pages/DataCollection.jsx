import {
    Database,
    CheckCircle2,
    Clock3,
} from "lucide-react"

import facebookLogo
    from "../assets/facebook-logo.png"

import instagramLogo
    from "../assets/instagram-logo.png"


function DataCollection() {
    const stats = [
        {
            label: "Total Collected",
            value: "53",
            description: "Comments and replies",
            icon: Database,
        },
        {
            label: "Instagram",
            value: "25",
            description: "Items collected",
            logo: instagramLogo,
        },
        {
            label: "Facebook",
            value: "28",
            description: "Items collected",
            logo: facebookLogo,
        },
    ]


    const sources = [
        {
            id: "instagram",
            name: "Instagram",
            description:
                "Choose a post and collect its comments and replies.",
            logo: instagramLogo,
        },
        {
            id: "facebook",
            name: "Facebook",
            description:
                "Choose a post and collect its comments and replies.",
            logo: facebookLogo,
        },
    ]


    const recentCollections = [
        {
            platform: "Instagram",
            title: "Residential Internet Offer",
            items: "12 items",
            status: "Completed",
            logo: instagramLogo,
        },
        {
            platform: "Facebook",
            title: "Network Maintenance Update",
            items: "10 items",
            status: "Completed",
            logo: facebookLogo,
        },
        {
            platform: "Instagram",
            title: "5G Network Rollout",
            items: "8 items",
            status: "Completed",
            logo: instagramLogo,
        },
    ]


    return (
        <div className="collection-page">

            <div className="collection-heading">
                <div>
                    <h1>Data Collection</h1>

                    <p>
                        Collect comments and replies
                        from your connected social media pages.
                    </p>
                </div>
            </div>


            <div className="collection-stats">
                {stats.map((stat) => {
                    const Icon = stat.icon

                    return (
                        <div
                            key={stat.label}
                            className="collection-stat-card"
                        >
                            <div className="collection-stat-icon">

                                {stat.logo ? (
                                    <img
                                        src={stat.logo}
                                        alt={stat.label}
                                        className="collection-platform-logo"
                                    />
                                ) : (
                                    <Icon size={24} />
                                )}

                            </div>

                            <div>
                                <span className="collection-stat-label">
                                    {stat.label}
                                </span>

                                <h2>
                                    {stat.value}
                                </h2>

                                <p>
                                    {stat.description}
                                </p>
                            </div>

                        </div>
                    )
                })}
            </div>


            <div className="collection-grid">

                <section className="collection-panel">

                    <div className="collection-panel-header">
                        <div>
                            <h2>
                                Collection Sources
                            </h2>

                            <p>
                                Select a platform,
                                then choose the post
                                you want to collect.
                            </p>
                        </div>
                    </div>


                    <div className="collection-source-list">

                        {sources.map((source) => (
                            <div
                                key={source.id}
                                className="collection-source-card"
                            >

                                <div className="source-platform-icon">
                                    <img
                                        src={source.logo}
                                        alt={source.name}
                                        className="collection-platform-logo"
                                    />
                                </div>


                                <div className="source-info">
                                    <h3>
                                        {source.name}
                                    </h3>

                                    <p>
                                        {source.description}
                                    </p>
                                </div>


                                <span className="connected-badge">
                                    Connected
                                </span>


                                <button
                                    className="choose-post-button"
                                >
                                    Choose Post
                                </button>

                            </div>
                        ))}

                    </div>

                </section>


                <section className="collection-panel">

                    <div className="collection-panel-header">
                        <div>
                            <h2>
                                Recent Collections
                            </h2>

                            <p>
                                Recently collected
                                social media content.
                            </p>
                        </div>
                    </div>


                    <div className="recent-collection-list">

                        {recentCollections.map(
                            (collection, index) => (
                                <div
                                    key={index}
                                    className="recent-collection-item"
                                >

                                    <div className="recent-platform-icon">
                                        <img
                                            src={collection.logo}
                                            alt={collection.platform}
                                            className="collection-platform-logo"
                                        />
                                    </div>


                                    <div className="recent-collection-info">
                                        <strong>
                                            {collection.platform}
                                        </strong>

                                        <span>
                                            {collection.title}
                                        </span>
                                    </div>


                                    <span className="recent-item-count">
                                        {collection.items}
                                    </span>


                                    <div className="collection-status">

                                        <CheckCircle2
                                            size={18}
                                        />

                                        <span>
                                            {collection.status}
                                        </span>

                                    </div>

                                </div>
                            )
                        )}

                    </div>

                </section>

            </div>


            <div className="collection-footer-note">

                <Clock3 size={18} />

                <span>
                    Collection runs only after
                    you select and confirm a post.
                </span>

            </div>

        </div>
    )
}


export default DataCollection