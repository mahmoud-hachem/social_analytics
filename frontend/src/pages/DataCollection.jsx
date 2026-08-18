import {
    useState,
} from "react"

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

    const [
        selectedPlatform,
        setSelectedPlatform,
    ] = useState(null)

    const [
        posts,
        setPosts,
    ] = useState([])

    const [
        loadingPosts,
        setLoadingPosts,
    ] = useState(false)

    const [
        postError,
        setPostError,
    ] = useState("")

    const [
    selectedPost,
    setSelectedPost,
] = useState(null)

const [
    collecting,
    setCollecting,
] = useState(false)

const [
    collectionError,
    setCollectionError,
] = useState("")

const [
    collectionResult,
    setCollectionResult,
] = useState(null)


    async function loadPosts(platform) {
        setSelectedPlatform(platform)
        setLoadingPosts(true)
        setPostError("")
        setPosts([])

        try {
            const response = await fetch(
                `http://127.0.0.1:8000/api/collection/${platform}/posts`
            )

            if (!response.ok) {
                throw new Error(
                    "Could not load posts."
                )
            }

            const data = await response.json()

            setPosts(
                data.posts || []
            )

        } catch (error) {
            setPostError(
                error.message
            )
        } finally {
            setLoadingPosts(false)
        }
    }

async function collectSelectedPost() {

    if (
        !selectedPlatform ||
        !selectedPost
    ) {
        return
    }

    setCollecting(true)
    setCollectionError("")
    setCollectionResult(null)

    try {

        const response = await fetch(
            `http://127.0.0.1:8000/api/collection/${selectedPlatform}/posts/${selectedPost.id}/collect`,
            {
                method: "POST",
            }
        )

        const data = await response.json()


        if (!response.ok) {
            throw new Error(
                data.detail ||
                "Collection failed."
            )
        }


        setCollectionResult(data)

        setSelectedPost(null)

    } catch (error) {

        setCollectionError(
            error.message
        )

    } finally {

        setCollecting(false)

    }
}
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
                    <h1>
                        Data Collection
                    </h1>

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
                                    onClick={() =>
                                        loadPosts(
                                            source.id
                                        )
                                    }
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


            {selectedPlatform && (
                <section className="collection-panel posts-panel">

                    <div className="collection-panel-header">
                        <div>
                            <h2>
                                {
                                    selectedPlatform === "facebook"
                                        ? "Facebook Posts"
                                        : "Instagram Posts"
                                }
                            </h2>

                            <p>
                                Choose the post you want
                                to collect.
                            </p>
                        </div>
                    </div>


                    {loadingPosts && (
                        <p>
                            Loading posts...
                        </p>
                    )}


                    {postError && (
                        <p className="collection-error">
                            {postError}
                        </p>
                    )}


                    {!loadingPosts &&
                        !postError &&
                        posts.length === 0 && (
                            <p>
                                No posts found.
                            </p>
                        )}


                    <div className="post-selection-list">

                        {posts.map((post) => (
                            <div
                                key={post.id}
                                className="post-selection-card"
                            >

                                <div className="post-selection-content">

                                    <span className="post-platform-name">
                                        {selectedPlatform}
                                    </span>

                                    <p>
                                        {
                                            post.text ||
                                            "No caption/message"
                                        }
                                    </p>

                                    <small>
                                        Post ID: {post.id}
                                    </small>

                                </div>

{selectedPost && (
    <div className="collection-confirm-overlay">

        <div className="collection-confirm-modal">

            <h2>
                Confirm Collection
            </h2>


            <p className="confirm-platform">
                {selectedPlatform === "facebook"
                    ? "Facebook"
                    : "Instagram"}
            </p>


            <div className="confirm-post-text">
                {selectedPost.text ||
                    "No caption/message"}
            </div>


            <div className="confirm-actions-list">

                <p>
                    ✓ Retrieve all comments
                </p>

                <p>
                    ✓ Retrieve all replies
                </p>

                <p>
                    ✓ Store/update content in MySQL
                </p>

                <p>
                    ✓ Automatically analyze new content
                </p>

            </div>


            {collectionError && (
                <p className="collection-error">
                    {collectionError}
                </p>
            )}


            <div className="confirm-buttons">

                <button
                    className="cancel-collection-button"
                    onClick={() =>
                        setSelectedPost(null)
                    }
                    disabled={collecting}
                >
                    Cancel
                </button>


                <button
                    className="choose-post-button"
                    onClick={
                        collectSelectedPost
                    }
                    disabled={collecting}
                >
                    {collecting
                        ? "Collecting..."
                        : "Collect & Analyze"}
                </button>

            </div>

        </div>

    </div>
)}

{collectionResult && (
    <div className="collection-result-card">

        <CheckCircle2
            size={24}
        />

        <div>
            <h3>
                Collection completed
            </h3>

            <p>
                Comments:
                {" "}
                {collectionResult.comments}
            </p>

            <p>
                Replies:
                {" "}
                {collectionResult.replies}
            </p>

            <p>
                Items processed:
                {" "}
                {
                    collectionResult
                        .items_processed
                }
            </p>

            <p>
                AI analysis started
                automatically.
            </p>
        </div>

    </div>
)}

                                <button
    className="choose-post-button"
    onClick={() =>
        setSelectedPost(post)
    }
>
    Select
</button>

                            </div>
                        ))}

                    </div>

                </section>
            )}


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