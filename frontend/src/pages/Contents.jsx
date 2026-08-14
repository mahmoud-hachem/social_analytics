import {
    useEffect,
    useState,
} from "react"

import {
    RotateCcw,
    Save,
    SlidersHorizontal,
    ChevronLeft,
    ChevronRight,
    MessageSquareText,
} from "lucide-react"

import {
    getComments,
} from "../api/analyticsApi.js"

import facebookLogo
    from "../assets/facebook-logo.png"

import instagramLogo
    from "../assets/instagram-logo.png"


const PLATFORM_LOGOS = {
    facebook: facebookLogo,
    instagram: instagramLogo,
}


const EMPTY_FILTERS = {
    platform: "",
    contentType: "",
    topic: "",
    sentiment: "",
    intent: "",
    severity: "",
}


function formatLabel(value) {
    if (!value) {
        return "-"
    }

    return value
        .replaceAll("_", " ")
        .replace(
            /\b\w/g,
            (letter) =>
                letter.toUpperCase()
        )
}


function Comments() {
    const [
        comments,
        setComments,
    ] = useState([])

    const [
        pagination,
        setPagination,
    ] = useState({
        page: 1,
        page_size: 20,
        total: 0,
        total_pages: 0,
    })

    const [
        loading,
        setLoading,
    ] = useState(true)

    const [
        error,
        setError,
    ] = useState(null)

    const [
        page,
        setPage,
    ] = useState(1)

    const [
        showFilters,
        setShowFilters,
    ] = useState(false)

    const [
        draftFilters,
        setDraftFilters,
    ] = useState(
        EMPTY_FILTERS
    )

    const [
        appliedFilters,
        setAppliedFilters,
    ] = useState(
        EMPTY_FILTERS
    )


    useEffect(() => {
        async function loadComments() {
            try {
                setLoading(true)
                setError(null)

                const data =
                    await getComments({
                        page,
                        pageSize: 20,

                        platform:
                            appliedFilters.platform,

                        contentType:
                            appliedFilters.contentType,

                        topic:
                            appliedFilters.topic,

                        sentiment:
                            appliedFilters.sentiment,

                        intent:
                            appliedFilters.intent,

                        severity:
                            appliedFilters.severity,
                    })

                setComments(
                    data.comments
                )

                setPagination(
                    data.pagination
                )

            } catch (err) {
                setError(
                    err.message
                )

            } finally {
                setLoading(false)
            }
        }

        loadComments()

    }, [
        page,
        appliedFilters,
    ])


    function handleToggleFilters() {
        if (!showFilters) {
            setDraftFilters(
                appliedFilters
            )
        }

        setShowFilters(
            !showFilters
        )
    }


    function handleFilterChange(
        name,
        value,
    ) {
        setDraftFilters(
            (current) => ({
                ...current,
                [name]: value,
            })
        )
    }


    function handleSaveFilters() {
        setAppliedFilters({
            ...draftFilters,
        })

        setPage(1)

        setShowFilters(false)
    }


    function handleResetFilters() {
        setDraftFilters({
            ...EMPTY_FILTERS,
        })

        setAppliedFilters({
            ...EMPTY_FILTERS,
        })

        setPage(1)

        setShowFilters(false)
    }


    function handlePreviousPage() {
        if (page > 1) {
            setPage(
                page - 1
            )
        }
    }


    function handleNextPage() {
        if (
            page
            < pagination.total_pages
        ) {
            setPage(
                page + 1
            )
        }
    }


    const hasAppliedFilters =
        Object.values(
            appliedFilters
        ).some(
            (value) =>
                value !== ""
        )


    return (
        <div className="comments-page">

            <header className="comments-page-header">

                <div>

                    <h1>
                        Contents
                    </h1>

                </div>


                <div className="comments-header-actions">

                    <div className="comments-total">

                        <MessageSquareText
                            size={20}
                        />

                        <span>
                            {
                                pagination.total
                            } analyzed interactions
                        </span>

                    </div>


                    {showFilters ? (
                        <>

                            <button
                                className="filter-action-btn reset-filter-btn"
                                onClick={
                                    handleResetFilters
                                }
                            >
                                <RotateCcw
                                    size={18}
                                />

                                <span>
                                    Reset
                                </span>
                            </button>


                            <button
                                className="filter-action-btn save-filter-btn"
                                onClick={
                                    handleSaveFilters
                                }
                            >
                                <Save
                                    size={18}
                                />

                                <span>
                                    Save
                                </span>
                            </button>

                        </>
                    ) : (
                        <>

                            {hasAppliedFilters && (
                                <button
                                    className="filter-action-btn reset-filter-btn"
                                    onClick={
                                        handleResetFilters
                                    }
                                >
                                    <RotateCcw
                                        size={18}
                                    />

                                    <span>
                                        Reset
                                    </span>
                                </button>
                            )}


                            <button
                                className="filter-toggle-btn"
                                onClick={
                                    handleToggleFilters
                                }
                            >
                                <SlidersHorizontal
                                    size={18}
                                />

                                <span>
                                    Filters
                                </span>
                            </button>

                        </>
                    )}

                </div>

            </header>


            {showFilters && (
                <section className="comments-toolbar">

                    <div className="comments-filter-row">

                        <select
                            value={
                                draftFilters.platform
                            }
                            onChange={
                                (event) =>
                                    handleFilterChange(
                                        "platform",
                                        event.target.value
                                    )
                            }
                        >
                            <option value="">
                                All Platforms
                            </option>

                            <option value="facebook">
                                Facebook
                            </option>

                            <option value="instagram">
                                Instagram
                            </option>
                        </select>


                        <select
                            value={
                                draftFilters.contentType
                            }
                            onChange={
                                (event) =>
                                    handleFilterChange(
                                        "contentType",
                                        event.target.value
                                    )
                            }
                        >
                            <option value="">
                                All Types
                            </option>

                            <option value="comment_under_official_post">
                                Comments
                            </option>

                            <option value="reply_to_comment">
                                Replies
                            </option>
                        </select>


                        <select
                            value={
                                draftFilters.topic
                            }
                            onChange={
                                (event) =>
                                    handleFilterChange(
                                        "topic",
                                        event.target.value
                                    )
                            }
                        >
                            <option value="">
                                All Topics
                            </option>

                            <option value="network_coverage">
                                Network Coverage
                            </option>

                            <option value="mobile_data_speed">
                                Mobile Data Speed
                            </option>

                            <option value="network_outage">
                                Network Outage
                            </option>

                            <option value="billing">
                                Billing
                            </option>

                            <option value="balance_deduction">
                                Balance Deduction
                            </option>

                            <option value="package_activation">
                                Package Activation
                            </option>

                            <option value="package_renewal">
                                Package Renewal
                            </option>

                            <option value="customer_service">
                                Customer Service
                            </option>

                            <option value="mobile_application">
                                Mobile Application
                            </option>

                            <option value="packages_offers">
                                Packages & Offers
                            </option>

                            <option value="roaming">
                                Roaming
                            </option>

                            <option value="pricing">
                                Pricing
                            </option>

                            <option value="sim_card">
                                SIM Card
                            </option>

                            <option value="router_device">
                                Router / Device
                            </option>

                            <option value="other">
                                Other
                            </option>
                        </select>


                        <select
                            value={
                                draftFilters.sentiment
                            }
                            onChange={
                                (event) =>
                                    handleFilterChange(
                                        "sentiment",
                                        event.target.value
                                    )
                            }
                        >
                            <option value="">
                                All Sentiments
                            </option>

                            <option value="positive">
                                Positive
                            </option>

                            <option value="neutral">
                                Neutral
                            </option>

                            <option value="negative">
                                Negative
                            </option>
                        </select>


                        <select
                            value={
                                draftFilters.intent
                            }
                            onChange={
                                (event) =>
                                    handleFilterChange(
                                        "intent",
                                        event.target.value
                                    )
                            }
                        >
                            <option value="">
                                All Intents
                            </option>

                            <option value="complaint">
                                Complaint
                            </option>

                            <option value="question">
                                Question
                            </option>

                            <option value="praise">
                                Praise
                            </option>

                            <option value="suggestion">
                                Suggestion
                            </option>

                            <option value="general_opinion">
                                General Opinion
                            </option>

                            <option value="confirmation">
                                Confirmation
                            </option>

                            <option value="disagreement">
                                Disagreement
                            </option>

                            <option value="follow_up">
                                Follow Up
                            </option>

                            <option value="informational_response">
                                Informational Response
                            </option>

                            <option value="mockery">
                                Mockery
                            </option>
                        </select>


                        <select
                            value={
                                draftFilters.severity
                            }
                            onChange={
                                (event) =>
                                    handleFilterChange(
                                        "severity",
                                        event.target.value
                                    )
                            }
                        >
                            <option value="">
                                All Severities
                            </option>

                            <option value="low">
                                Low
                            </option>

                            <option value="medium">
                                Medium
                            </option>

                            <option value="high">
                                High
                            </option>
                        </select>

                    </div>

                </section>
            )}


            <section className="comments-table-card">

                {loading ? (

                    <div className="comments-status">
                        Loading comments...
                    </div>

                ) : error ? (

                    <div className="comments-status comments-error">
                        {error}
                    </div>

                ) : comments.length === 0 ? (

                    <div className="comments-status">
                        No comments found.
                    </div>

                ) : (

                    <div className="comments-table-scroll">

                        <table className="comments-table">

                            <thead>
                                <tr>

                                    <th>
                                        ID
                                    </th>

                                    <th>
                                        Platform
                                    </th>

                                    <th>
                                        Type
                                    </th>

                                    <th>
                                        Content
                                    </th>

                                    <th>
                                        Topic
                                    </th>

                                    <th>
                                        Intent
                                    </th>

                                    <th>
                                        Sentiment
                                    </th>

                                    <th>
                                        Severity
                                    </th>

                                    <th>
                                        Confidence
                                    </th>

                                </tr>
                            </thead>


                            <tbody>

                                {comments.map(
                                    (comment) => {

                                        const confidence =
                                            Math.round(
                                                comment.confidence
                                                * 100
                                            )

                                        return (
                                            <tr
                                                key={
                                                    comment.id
                                                }
                                            >

                                                <td>
                                                    {
                                                        comment.id
                                                    }
                                                </td>


                                                <td>

                                                    <div className="comments-platform">

                                                        <img
                                                            src={
                                                                PLATFORM_LOGOS[
                                                                    comment.platform
                                                                ]
                                                            }
                                                            alt={
                                                                comment.platform
                                                            }
                                                        />

                                                        <span>
                                                            {
                                                                formatLabel(
                                                                    comment.platform
                                                                )
                                                            }
                                                        </span>

                                                    </div>

                                                </td>


                                                <td>

                                                    <span
                                                        className={
                                                            `comment-type-badge ${
                                                                comment.content_type
                                                                === "reply_to_comment"
                                                                    ? "comment-type-reply"
                                                                    : "comment-type-comment"
                                                            }`
                                                        }
                                                    >
                                                        {
                                                            comment.content_type
                                                            === "reply_to_comment"
                                                                ? "Reply"
                                                                : "Comment"
                                                        }
                                                    </span>

                                                </td>


                                                <td className="comments-content-cell">

                                                    <div className="comments-main-text">
                                                        {
                                                            comment.content_text
                                                        }
                                                    </div>

                                                    <div className="comments-date">
                                                        {
                                                            comment.published_at
                                                            ? new Date(
                                                                comment.published_at
                                                            ).toLocaleString()
                                                            : "-"
                                                        }
                                                    </div>

                                                </td>


                                                <td>
                                                    {
                                                        formatLabel(
                                                            comment.topic
                                                        )
                                                    }
                                                </td>


                                                <td>
                                                    {
                                                        formatLabel(
                                                            comment.intent
                                                        )
                                                    }
                                                </td>


                                                <td>

                                                    <span
                                                        className={
                                                            `sentiment-badge sentiment-${comment.sentiment}`
                                                        }
                                                    >
                                                        {
                                                            formatLabel(
                                                                comment.sentiment
                                                            )
                                                        }
                                                    </span>

                                                </td>


                                                <td>

                                                    <span
                                                        className={
                                                            `severity-badge severity-${comment.severity}`
                                                        }
                                                    >
                                                        {
                                                            formatLabel(
                                                                comment.severity
                                                            )
                                                        }
                                                    </span>

                                                </td>


                                                <td>

                                                    <div className="comments-confidence">

                                                        <span>
                                                            {
                                                                confidence
                                                            }%
                                                        </span>

                                                        <div className="comments-confidence-track">

                                                            <div
                                                                className="comments-confidence-fill"
                                                                style={{
                                                                    width:
                                                                        `${confidence}%`,
                                                                }}
                                                            />

                                                        </div>

                                                    </div>

                                                </td>

                                            </tr>
                                        )
                                    }
                                )}

                            </tbody>

                        </table>

                    </div>

                )}


                <div className="comments-pagination">

                    <div className="comments-pagination-info">

                        Page {
                            pagination.page
                        } of {
                            pagination.total_pages
                            || 1
                        }

                        <span>
                            {
                                pagination.total
                            } total
                        </span>

                    </div>


                    <div className="comments-pagination-buttons">

                        <button
                            onClick={
                                handlePreviousPage
                            }
                            disabled={
                                page <= 1
                            }
                        >
                            <ChevronLeft
                                size={17}
                            />

                            Previous
                        </button>


                        <button
                            onClick={
                                handleNextPage
                            }
                            disabled={
                                page
                                >= pagination.total_pages
                            }
                        >
                            Next

                            <ChevronRight
                                size={17}
                            />
                        </button>

                    </div>

                </div>

            </section>

        </div>
    )
}


export default Comments