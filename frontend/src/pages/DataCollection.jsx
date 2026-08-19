import { useEffect, useState } from "react"

import {
    Bell,
    CheckCircle2,
    ExternalLink,
    RefreshCw,
    X,
} from "lucide-react"

import facebookLogo
    from "../assets/facebook-logo.png"

import instagramLogo
    from "../assets/instagram-logo.png"


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


const ALERTS_STORAGE_KEY = "social-analytics-pending-alerts"
const ALERTS_CHECKED_STORAGE_KEY = "social-analytics-alerts-checked"
const ALERTS_LAST_CHECK_STORAGE_KEY = "social-analytics-alerts-last-check"




function readStoredAlerts() {
    try {
        const raw = localStorage.getItem(ALERTS_STORAGE_KEY)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}


function readStoredLastCheck() {
    const raw = localStorage.getItem(ALERTS_LAST_CHECK_STORAGE_KEY)

    if (!raw) {
        return null
    }

    const value = new Date(raw)
    return Number.isNaN(value.getTime()) ? null : value
}


function DataCollection({ onOpenContent }) {

    const [
        selectedPlatform,
        setSelectedPlatform,
    ] = useState(null)

    const [posts, setPosts] = useState([])
    const [loadingPosts, setLoadingPosts] = useState(false)
    const [postError, setPostError] = useState("")

    const [selectedPost, setSelectedPost] = useState(null)
    const [loadingPreview, setLoadingPreview] = useState(false)
    const [previewError, setPreviewError] = useState("")

    const [collecting, setCollecting] = useState(false)
    const [collectionError, setCollectionError] = useState("")
    const [collectionResult, setCollectionResult] = useState(null)

    useEffect(() => {
    if (!collectionResult && !collectionError) {
        return
    }

    const timeout = setTimeout(() => {
        setCollectionResult(null)
        setCollectionError("")
    }, 5000)

    return () => clearTimeout(timeout)
}, [collectionResult, collectionError])

    const [pendingAlerts, setPendingAlerts] = useState(readStoredAlerts)
    const [pendingLoading, setPendingLoading] = useState(false)
    const [hasCheckedAlerts, setHasCheckedAlerts] = useState(
        () => localStorage.getItem(ALERTS_CHECKED_STORAGE_KEY) === "true"
    )
    const [pendingError, setPendingError] = useState("")
    const [lastAlertCheck, setLastAlertCheck] = useState(readStoredLastCheck)


    async function loadPendingAlerts({ silent = false } = {}) {
        if (!silent) {
            setPendingLoading(true)
        }

        setPendingError("")

        try {
            const response = await fetch(
                "http://127.0.0.1:8000/api/collection/pending"
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(
                    data.detail
                    || "Could not check for new content."
                )
            }

            const alerts = data.alerts || []
            const checkedAt = new Date()

            setPendingAlerts(alerts)
            setLastAlertCheck(checkedAt)
            setHasCheckedAlerts(true)

            localStorage.setItem(
                ALERTS_STORAGE_KEY,
                JSON.stringify(alerts),
            )
            localStorage.setItem(
                ALERTS_CHECKED_STORAGE_KEY,
                "true",
            )
            localStorage.setItem(
                ALERTS_LAST_CHECK_STORAGE_KEY,
                checkedAt.toISOString(),
            )

        } catch (error) {
            setPendingError(error.message)

        } finally {
            if (!silent) {
                setPendingLoading(false)
            }
        }
    }


    async function loadPosts(platform) {
        setSelectedPlatform(platform)
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

            const data = await response.json()

            if (!response.ok) {
                throw new Error(
                    data.detail
                    || "Could not load posts."
                )
            }

            setPosts(data.posts || [])

        } catch (error) {
            setPostError(error.message)

        } finally {
            setLoadingPosts(false)
        }
    }


    async function handleSelectPost(post, index) {
        const displayLabel = `Post ${index + 1}`

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

            setSelectedPost((currentValue) => {
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
            })

        } catch (error) {
            setPreviewError(error.message)

        } finally {
            setLoadingPreview(false)
        }
    }


    async function collectSelectedPost() {
        if (!selectedPlatform || !selectedPost) {
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
                    || "Collection and analysis failed."
                )
            }

            setCollectionResult({
                ...data,
                postLabel: postBeingCollected.displayLabel,
            })

            const remainingAlerts = pendingAlerts.filter(
                (alert) => !(
                    alert.platform === selectedPlatform
                    && String(alert.post_id) === String(postBeingCollected.id)
                )
            )

            setPendingAlerts(remainingAlerts)
            localStorage.setItem(
                ALERTS_STORAGE_KEY,
                JSON.stringify(remainingAlerts),
            )

            setSelectedPost(null)
        } catch (error) {
            setCollectionError(error.message)

        } finally {
            setCollecting(false)
        }
    }


    async function openAlertPost(alert) {
        await loadPosts(alert.platform)
    }


    const sources = [
        {
            id: "facebook",
            name: "Facebook",
            description:
                "Choose a post and collect its comments and replies.",
            logo: facebookLogo,
        },
        {
            id: "instagram",
            name: "Instagram",
            description:
                "Choose a post and collect its comments and replies.",
            logo: instagramLogo,
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
                    <h1>Data Collection</h1>
                </div>

                {collectionResult && (
    <div className="collection-toast collection-toast-success">
        <CheckCircle2 size={20} />

        <div>
            <strong>Collection completed</strong>
            <span>
                {collectionResult.items_processed} items collected and analyzed.
            </span>
        </div>

        <button
            type="button"
            onClick={() => setCollectionResult(null)}
            aria-label="Close notification"
        >
            <X size={17} />
        </button>
    </div>
)}

{collectionError && (
    <div className="collection-toast collection-toast-error">
        <div>
            <strong>Collection failed</strong>
            <span>{collectionError}</span>
        </div>

        <button
            type="button"
            onClick={() => setCollectionError("")}
            aria-label="Close notification"
        >
            <X size={17} />
        </button>
    </div>
)}
            </div>

            <div className="collection-grid">
                <section className="collection-panel">
                    <div className="collection-panel-header">
                        <div>
                            <h2>Collection Sources</h2>
                            <p>
                                Select a platform, then choose
                                the post you want to collect.
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
                                    <h3>{source.name}</h3>
                                    <p>{source.description}</p>
                                </div>

                                <span className="connected-badge">
                                    Connected
                                </span>

                                <button
                                    className="choose-post-button"
                                    onClick={() => loadPosts(source.id)}
                                >
                                    Choose Post
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="collection-panel collection-alerts-panel">
                    <div className="collection-panel-header collection-alerts-header">
                        <div>
                            <h2>Collection Alerts</h2>
                            <p>
                                New comments and replies waiting
                                to be collected.
                            </p>
                        </div>

                        <button
                            className="collection-refresh-button"
                            onClick={() => loadPendingAlerts()}
                            disabled={pendingLoading}
                            title="Check for new content"
                        >
                            <RefreshCw
                                size={17}
                                className={
                                    pendingLoading
                                        ? "refresh-spinning"
                                        : ""
                                }
                            />
                        </button>
                    </div>

                    {pendingLoading ? (
                        <div className="collection-alert-empty">
                            <span>Checking for new content...</span>
                        </div>
                    ) : pendingError ? (
                        <div className="collection-alert-empty alert-error-state">
                            <strong>Could not check content</strong>
                            <span>{pendingError}</span>
                        </div>
                    ) : !hasCheckedAlerts ? (
                        <div className="collection-alert-empty">
                            <Bell size={24} />
                            <strong>Check for new content</strong>
                            <span>
                                Click refresh to check for new comments or replies.
                            </span>
                        </div>
                    ) : pendingAlerts.length === 0 ? (
                        <div className="collection-alert-empty alert-up-to-date">
                            <CheckCircle2 size={24} />
                            <strong>All content collected</strong>
                            <span>
                                No new comments or replies are waiting.
                            </span>
                        </div>
                    ) : (
                        <div className="collection-alert-list">
                            {pendingAlerts.map((alert) => {
                                const isFacebook =
                                    alert.platform === "facebook"

                                const logo = isFacebook
                                    ? facebookLogo
                                    : instagramLogo

                                const name = isFacebook
                                    ? "Facebook"
                                    : "Instagram"

                                return (
                                    <button
                                        key={`${alert.platform}-${alert.post_id}`}
                                        className="collection-alert-item"
                                        onClick={() => openAlertPost(alert)}
                                    >
                                        <div className="collection-alert-icon">
                                            <img
                                                src={logo}
                                                alt={name}
                                                className="collection-platform-logo"
                                            />
                                        </div>

                                        <div className="collection-alert-info">
                                            <strong>
                                                {name} · Post {alert.post_number}
                                            </strong>

                                            <span>
                                                {alert.new_comments} new comment{alert.new_comments === 1 ? "" : "s"}
                                                {" · "}
                                                {alert.new_replies} new repl{alert.new_replies === 1 ? "y" : "ies"}
                                            </span>
                                        </div>

                                        <span className="collection-alert-count">
                                            {alert.new_items} new
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    {lastAlertCheck && !pendingLoading && (
                        <div className="collection-alert-last-check">
                            Last checked {lastAlertCheck.toLocaleTimeString()}
                        </div>
                    )}
                </section>
            </div>

            {selectedPlatform && (
                <section className="collection-panel posts-panel">
                    <div className="collection-panel-header posts-panel-header">
                        <div>
                            <h2>{platformName} Posts</h2>

                        </div>
                    </div>

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
                                    {posts.map((post, index) => {
                                        const pendingAlert = pendingAlerts.find(
                                            (alert) =>
                                                alert.platform === selectedPlatform
                                                && String(alert.post_id) === String(post.id)
                                        )

                                        return (
                                            <div
                                                key={post.id}
                                                className={`post-selection-card${
                                                    pendingAlert
                                                        ? " post-selection-card-pending"
                                                        : ""
                                                }`}
                                            >
                                                <div className="post-selection-main">
                                                    <strong className="post-number">
                                                        Post {index + 1}
                                                    </strong>

                                                    <p className="post-caption-preview">
                                                        {post.text || "No caption/message"}
                                                    </p>
                                                </div>

                                                <div className="post-selection-actions">
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

                                                    {pendingAlert && (
                                                        <button
                                                            className="post-pending-button"
                                                            onClick={() =>
                                                                handleSelectPost(
                                                                    post,
                                                                    index,
                                                                )
                                                            }
                                                        >
                                                            {pendingAlert.new_items} new item{
                                                                pendingAlert.new_items === 1
                                                                    ? ""
                                                                    : "s"
                                                            }
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                        {collectionResult && (
                            <div className="collection-result-card">
                                <CheckCircle2 size={22} />
                                <div>
                                    <h3>
                                        {collectionResult.postLabel}
                                        {" "}
                                        collected and analyzed
                                    </h3>
                                    <p>
                                        Total items: {collectionResult.items_processed}
                                    </p>
                                    <p>
                                        Newly analyzed: {collectionResult.analyzed_items}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
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
                                    <span>{platformName}</span>
                                    <h2>{selectedPost.displayLabel}</h2>
                                </div>
                            </div>
                        </div>

                        <div className="confirm-caption-block">
                            <span className="confirm-section-label">
                                Caption
                            </span>
                            <p>
                                {selectedPost.text || "No caption/message"}
                            </p>
                        </div>

                        <div className="confirm-details-grid confirm-details-grid-two">
                            <div className="confirm-detail-card">
                                <span>Total items</span>
                                <strong>
                                    {loadingPreview
                                        ? "..."
                                        : (selectedPost.preview?.total_items
                                            ?? "—")}
                                </strong>
                                <small>
                                    Current comments + replies
                                </small>
                            </div>

                            <div className="confirm-detail-card new-items-card">
                                <span>New items</span>
                                <strong>
                                    {loadingPreview
                                        ? "..."
                                        : (selectedPost.preview?.new_items
                                            ?? "—")}
                                </strong>
                                <small>
                                    Not collected or analyzed yet
                                </small>
                            </div>
                        </div>

                        <div className="confirm-post-meta">
                            <div>
                                <span>Post ID</span>
                                <strong>{selectedPost.id}</strong>
                            </div>
                            <div>
                                <span>Published</span>
                                <strong>
                                    {formatPostDate(selectedPostDate)}
                                </strong>
                            </div>
                            <div>
                                <span>Type</span>
                                <strong>{selectedPostType}</strong>
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
                            New content will be stored and AI analysis
                            will finish before this collection is marked complete.
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
    onClick={collectSelectedPost}
    disabled={
        collecting
        || loadingPreview
        || Number(
            selectedPost.preview?.new_items
            || 0
        ) === 0
    }
>
    {
        collecting
            ? "Collecting & analyzing..."
            : loadingPreview
                ? "Loading details..."
                : Number(
                    selectedPost.preview?.new_items
                    || 0
                ) === 0
                    ? "No New Content"
                    : "Collect & Analyze"
    }
</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}


export default DataCollection