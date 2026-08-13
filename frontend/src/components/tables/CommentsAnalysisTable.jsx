import {
    useEffect,
    useState,
} from "react"

import {
    getRecentAnalysis,
} from "../../api/analyticsApi.js"

import facebookLogo
    from "../../assets/facebook-logo.png"

import instagramLogo
    from "../../assets/instagram-logo.png"


const PLATFORM_LOGOS = {
    facebook: facebookLogo,
    instagram: instagramLogo,
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


function CommentsAnalysisTable({
    filters,
}) {
    const [
        content,
        setContent,
    ] = useState([])

    const [
        loading,
        setLoading,
    ] = useState(true)

    const [
        error,
        setError,
    ] = useState(null)


    useEffect(() => {
        async function loadContent() {
            try {
                setLoading(true)
                setError(null)

                const result =
                    await getRecentAnalysis(
                        filters
                    )

                setContent(
                    result.content
                )

            } catch (err) {
                setError(err.message)

            } finally {
                setLoading(false)
            }
        }

        loadContent()

    }, [filters])


    if (loading) {
        return (
            <div className="overview-wide-card">

                <div className="table-status">
                    Loading AI analysis...
                </div>

            </div>
        )
    }


    if (error) {
        return (
            <div className="overview-wide-card">

                <div className="table-status table-error">
                    {error}
                </div>

            </div>
        )
    }


    return (
        <div className="overview-wide-card">

            <div className="wide-card-header">

                <div>

                    <h2>
                        Comments / AI Analysis
                    </h2>

                    <p>
                        Latest analyzed Facebook
                        and Instagram interactions.
                    </p>

                </div>

            </div>


            <div className="table-scroll">

                <table className="analytics-table analysis-table">

                    <thead>
                        <tr>

                            <th>
                                ID
                            </th>

                            <th>
                                Platform
                            </th>

                            <th>
                                Content
                            </th>

                            <th>
                                Post Topic
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

                        {content.map(
                            (item) => {

                                const confidence =
                                    Math.round(
                                        item.confidence
                                        * 100
                                    )

                                return (
                                    <tr
                                        key={
                                            item.id
                                        }
                                    >

                                        <td>
                                            {
                                                item.id
                                            }
                                        </td>


                                        <td>

                                            <div className="table-platform">

                                                <img
                                                    src={
                                                        PLATFORM_LOGOS[
                                                            item.platform
                                                        ]
                                                    }
                                                    alt={
                                                        item.platform
                                                    }
                                                    className="table-platform-logo"
                                                />

                                                <span>
                                                    {
                                                        formatLabel(
                                                            item.platform
                                                        )
                                                    }
                                                </span>

                                            </div>

                                        </td>


                                        <td className="content-cell">
                                            {
                                                item.content_text
                                            }
                                        </td>


                                        <td>
                                            {
                                                formatLabel(
                                                    item.post_topic
                                                )
                                            }
                                        </td>


                                        <td>
                                            {
                                                formatLabel(
                                                    item.topic
                                                )
                                            }
                                        </td>


                                        <td>
                                            {
                                                formatLabel(
                                                    item.intent
                                                )
                                            }
                                        </td>


                                        <td>

                                            <span
                                                className={
                                                    `sentiment-badge sentiment-${item.sentiment}`
                                                }
                                            >
                                                {
                                                    formatLabel(
                                                        item.sentiment
                                                    )
                                                }
                                            </span>

                                        </td>


                                        <td>

                                            <span
                                                className={
                                                    `severity-badge severity-${item.severity}`
                                                }
                                            >
                                                {
                                                    formatLabel(
                                                        item.severity
                                                    )
                                                }
                                            </span>

                                        </td>


                                        <td>

                                            <div className="confidence-cell">

                                                <span>
                                                    {
                                                        confidence
                                                    }%
                                                </span>

                                                <div className="confidence-bar">

                                                    <div
                                                        className="confidence-fill"
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

        </div>
    )
}


export default CommentsAnalysisTable