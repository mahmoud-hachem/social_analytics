import {
    useState,
} from "react"

import {
    CheckCircle2,
    Clock3,
    ChevronDown,
    ChevronUp,
    ExternalLink,
} from "lucide-react"

import facebookLogo
    from "../assets/facebook-logo.png"

import instagramLogo
    from "../assets/instagram-logo.png"


const RECENT_COLLECTIONS_KEY =
    "touchboard_recent_collections_v2"


function readRecentCollections() {
    try {
        const storedValue = localStorage.getItem(
            RECENT_COLLECTIONS_KEY
        )

        if (!storedValue) {
            return []
        }

        const parsedValue = JSON.parse(
            storedValue
        )

        return Array.isArray(parsedValue)
            ? parsedValue
            : []

    } catch {
        return []
    }
}


function formatPostDate(value) {
    if (!value) {
        return "Not available"
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return value
    }

    return date.toLocaleString()
}


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
        postsExpanded,
        setPostsExpanded,
    ] = useState(false)

    const [
        expandedPostIds,
        setExpandedPostIds,
    ] = useState({})

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
        loadingPreview,
        setLoadingPreview,
    ] = useState(false)

    const [
        previewError,
        setPreviewError,
    ] = useState("")

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

    const [
        recentCollections,
        setRecentCollections,
    ] = useState(readRecentCollections)


    async function loadPosts(platform) {
        if (
            selectedPlatform === platform
            && posts.length > 0
        ) {
            setPostsExpanded(
                (currentValue) => !currentValue
            )
            return
        }

        setSelectedPlatform(platform)
        setPostsExpanded(true)
        setExpandedPostIds({})
        setLoadingPosts(true)
        setPostError("")
        setCollectionError("")
        setCollectionResult(null)
        setSelectedPost(null)
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


    function togglePostCaption(postId) {
        setExpandedPostIds(
            (currentValue) => ({
                ...currentValue,
                [postId]: !currentValue[postId],
            })
        )
    }


    async function handleSelectPost(
        post,
        index,
    ) {
        const displayLabel =
            `Post ${index + 1}`

        setCollectionError("")
        setCollectionResult(null)
        setPreviewError("")
        setLoadingPreview(true)

        setSelectedPost({
            ...post,
            displayLabel,
            preview: null,
        })

        try {
            const response = await fetch(
                `http://127.0.0.1:8000/api/collection/${selectedPlatform}/posts/${post.id}/preview`
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(
                    data.detail
                    || "Could not load post details."
                )
            }

            setSelectedPost(
                (currentValue) => {
                    if (
                        !currentValue
                        || currentValue.id !== post.id
                    ) {
                        return currentValue
                    }

                    return {
                        ...currentValue,
                        preview: data,
                    }
                }
            )

        } catch (error) {
            setPreviewError(
                error.message
            )

        } finally {
            setLoadingPreview(false)
        }
    }


    function saveRecentCollection(
        post,
        result,
    ) {
        const newCollection = {
            id: `${Date.now()}-${selectedPlatform}-${post.id}`,
            platform: selectedPlatform,
            postId: post.id,
            postLabel: post.displayLabel,
            caption:
                post.text
                || "No caption/message",
            comments: result.comments || 0,
            replies: result.replies || 0,
            itemsProcessed:
                result.items_processed || 0,
            collectedAt:
                new Date().toISOString(),
        }

        setRecentCollections(
            (currentValue) => {
                const nextValue = [
                    newCollection,
                    ...currentValue,
                ].slice(0, 5)

                try {
                    localStorage.setItem(
                        RECENT_COLLECTIONS_KEY,
                        JSON.stringify(nextValue)
                    )
                } catch {
                    // Keep the UI working if storage is unavailable.
                }

                return nextValue
            }
        )
    }


    async function collectSelectedPost() {
        if (
            !selectedPlatform
            || !selectedPost
        ) {
            return
        }

        const postBeingCollected = {
            ...selectedPost,
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
                    data.detail
                    || "Collection failed."
                )
            }

            setCollectionResult({
                ...data,
                postLabel:
                    postBeingCollected.displayLabel,
            })

            saveRecentCollection(
                postBeingCollected,
                data,
            )

            setSelectedPost(null)

        } catch (error) {
            setCollectionError(
                error.message
            )

        } finally {
            setCollecting(false)
        }
    }


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


    const platformName =
        selectedPlatform === "facebook"
            ? "Facebook"
            : "Instagram"

    const selectedPostDate =
        selectedPost?.preview?.created_time
        || selectedPost?.preview?.timestamp
        || selectedPost?.created_time
        || selectedPost?.timestamp

    const selectedPostType =
        selectedPost?.preview?.media_type
        || selectedPost?.media_type
        || "Post"

    const selectedPostPermalink =
        selectedPost?.preview?.permalink
        || selectedPost?.permalink


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


                <section className="collection-panel recent-collections-panel">
                    <div className="collection-panel-header">
                        <div>
                            <h2>
                                Recent Collections
                            </h2>

                            <p>
                                Posts collected from this page.
                            </p>
                        </div>
                    </div>

                    {recentCollections.length === 0 ? (
                        <div className="recent-collection-empty">
                            <strong>
                                No recent data
                            </strong>
                            <span>
                                Your next successful collection
                                will appear here.
                            </span>
                        </div>
                    ) : (
                        <div className="recent-collection-list">
                            {recentCollections.map(
                                (collection) => {
                                    const logo =
                                        collection.platform === "facebook"
                                            ? facebookLogo
                                            : instagramLogo

                                    const name =
                                        collection.platform === "facebook"
                                            ? "Facebook"
                                            : "Instagram"

                                    return (
                                        <div
                                            key={collection.id}
                                            className="recent-collection-item"
                                        >
                                            <div className="recent-platform-icon">
                                                <img
                                                    src={logo}
                                                    alt={name}
                                                    className="collection-platform-logo"
                                                />
                                            </div>

                                            <div className="recent-collection-info">
                                                <strong>
                                                    {name}
                                                    {" · "}
                                                    {collection.postLabel}
                                                </strong>

                                                <span>
                                                    {collection.caption}
                                                </span>

                                                <small>
                                                    {formatPostDate(
                                                        collection.collectedAt
                                                    )}
                                                </small>
                                            </div>

                                            <span className="recent-item-count">
                                                {collection.itemsProcessed}
                                                {" items"}
                                            </span>

                                            <div className="collection-status">
                                                <CheckCircle2
                                                    size={18}
                                                />

                                                <span>
                                                    Completed
                                                </span>
                                            </div>
                                        </div>
                                    )
                                }
                            )}
                        </div>
                    )}
                </section>
            </div>


            {selectedPlatform && (
                <section className="collection-panel posts-panel">
                    <div className="collection-panel-header posts-panel-header">
                        <div>
                            <h2>
                                {platformName} Posts
                            </h2>

                            <p>
                                Preview a caption,
                                then select the post to collect.
                            </p>
                        </div>

                        <button
                            className="posts-panel-toggle"
                            onClick={() =>
                                setPostsExpanded(
                                    (currentValue) =>
                                        !currentValue
                                )
                            }
                            aria-label={
                                postsExpanded
                                    ? "Collapse posts"
                                    : "Expand posts"
                            }
                            title={
                                postsExpanded
                                    ? "Collapse posts"
                                    : "Expand posts"
                            }
                        >
                            {postsExpanded ? (
                                <ChevronUp size={20} />
                            ) : (
                                <ChevronDown size={20} />
                            )}
                        </button>
                    </div>

                    {postsExpanded && (
                        <div className="posts-panel-body">
                            {loadingPosts && (
                                <p className="collection-posts-status">
                                    Loading posts...
                                </p>
                            )}

                            {postError && (
                                <p className="collection-error">
                                    {postError}
                                </p>
                            )}

                            {!loadingPosts
                                && !postError
                                && posts.length === 0 && (
                                    <p className="collection-posts-status">
                                        No posts found.
                                    </p>
                                )}

                            {!loadingPosts
                                && !postError
                                && posts.length > 0 && (
                                    <div className="post-selection-list">
                                        {posts.map(
                                            (post, index) => {
                                                const captionExpanded =
                                                    Boolean(
                                                        expandedPostIds[
                                                            post.id
                                                        ]
                                                    )

                                                return (
                                                    <div
                                                        key={post.id}
                                                        className="post-selection-card"
                                                    >
                                                        <div className="post-selection-main">
                                                            <button
                                                                className="post-caption-toggle"
                                                                onClick={() =>
                                                                    togglePostCaption(
                                                                        post.id
                                                                    )
                                                                }
                                                                aria-label={
                                                                    captionExpanded
                                                                        ? `Collapse Post ${index + 1} caption`
                                                                        : `Expand Post ${index + 1} caption`
                                                                }
                                                            >
                                                                <strong className="post-number">
                                                                    Post {index + 1}
                                                                </strong>

                                                                {captionExpanded ? (
                                                                    <ChevronUp size={17} />
                                                                ) : (
                                                                    <ChevronDown size={17} />
                                                                )}
                                                            </button>

                                                            <p
                                                                className={
                                                                    captionExpanded
                                                                        ? "post-caption-preview expanded"
                                                                        : "post-caption-preview"
                                                                }
                                                            >
                                                                {
                                                                    post.text
                                                                    || "No caption/message"
                                                                }
                                                            </p>
                                                        </div>

                                                        <button
                                                            className="choose-post-button post-select-button"
                                                            onClick={() =>
                                                                handleSelectPost(
                                                                    post,
                                                                    index,
                                                                )
                                                            }
                                                        >
                                                            Select
                                                        </button>
                                                    </div>
                                                )
                                            }
                                        )}
                                    </div>
                                )}

                            {collectionResult && (
                                <div className="collection-result-card">
                                    <CheckCircle2
                                        size={22}
                                    />

                                    <div>
                                        <h3>
                                            {collectionResult.postLabel}
                                            {" "}
                                            collected
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
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </section>
            )}


            {selectedPost && (
                <div className="collection-confirm-overlay">
                    <div className="collection-confirm-modal collection-post-details-modal">
                        <div className="confirm-modal-heading">
                            <div className="confirm-platform-heading">
                                <img
                                    src={
                                        selectedPlatform === "facebook"
                                            ? facebookLogo
                                            : instagramLogo
                                    }
                                    alt={platformName}
                                    className="confirm-platform-logo"
                                />

                                <div>
                                    <span>
                                        {platformName}
                                    </span>
                                    <h2>
                                        {selectedPost.displayLabel}
                                    </h2>
                                </div>
                            </div>
                        </div>

                        <div className="confirm-caption-block">
                            <span className="confirm-section-label">
                                Caption
                            </span>

                            <p>
                                {
                                    selectedPost.text
                                    || "No caption/message"
                                }
                            </p>
                        </div>

                        <div className="confirm-details-grid">
                            <div className="confirm-detail-card">
                                <span>
                                    Comments
                                </span>
                                <strong>
                                    {loadingPreview
                                        ? "..."
                                        : (selectedPost.preview?.comments
                                            ?? "—")}
                                </strong>
                            </div>

                            <div className="confirm-detail-card">
                                <span>
                                    Replies
                                </span>
                                <strong>
                                    {loadingPreview
                                        ? "..."
                                        : (selectedPost.preview?.replies
                                            ?? "—")}
                                </strong>
                            </div>

                            <div className="confirm-detail-card">
                                <span>
                                    Total items
                                </span>
                                <strong>
                                    {loadingPreview
                                        ? "..."
                                        : (selectedPost.preview?.items_total
                                            ?? "—")}
                                </strong>
                            </div>
                        </div>

                        <div className="confirm-post-meta">
                            <div>
                                <span>
                                    Post ID
                                </span>
                                <strong>
                                    {selectedPost.id}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Published
                                </span>
                                <strong>
                                    {formatPostDate(
                                        selectedPostDate
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Type
                                </span>
                                <strong>
                                    {selectedPostType}
                                </strong>
                            </div>
                        </div>

                        {selectedPostPermalink && (
                            <a
                                className="confirm-post-link"
                                href={selectedPostPermalink}
                                target="_blank"
                                rel="noreferrer"
                            >
                                View original post
                                <ExternalLink size={15} />
                            </a>
                        )}

                        {previewError && (
                            <p className="collection-error confirm-preview-error">
                                {previewError}
                            </p>
                        )}

                        <p className="confirm-note">
                            Comments and replies will be collected,
                            stored, and analyzed automatically.
                        </p>

                        {collectionError && (
                            <p className="collection-error">
                                {collectionError}
                            </p>
                        )}

                        <div className="confirm-buttons">
                            <button
                                className="cancel-collection-button"
                                onClick={() => {
                                    setSelectedPost(null)
                                    setPreviewError("")
                                }}
                                disabled={collecting}
                            >
                                Cancel
                            </button>

                            <button
                                className="choose-post-button"
                                onClick={
                                    collectSelectedPost
                                }
                                disabled={
                                    collecting
                                    || loadingPreview
                                }
                            >
                                {collecting
                                    ? "Collecting..."
                                    : loadingPreview
                                        ? "Loading details..."
                                        : "Collect & Analyze"}
                            </button>
                        </div>
                    </div>
                </div>
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