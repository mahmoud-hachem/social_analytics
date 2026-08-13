import {
    useEffect,
    useState,
} from "react"

import {
    AlertTriangle,
} from "lucide-react"

import {
    getHighSeverity,
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


function HighSeverityTable({
    filters,
}) {
    const [
        issues,
        setIssues,
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
        async function loadIssues() {
            try {
                setLoading(true)
                setError(null)

                const result =
                    await getHighSeverity(
                        filters
                    )

                setIssues(
                    result.issues
                )

            } catch (err) {
                setError(err.message)

            } finally {
                setLoading(false)
            }
        }

        loadIssues()

    }, [filters])


    if (loading) {
        return (
            <div className="overview-wide-card">
                <div className="table-status">
                    Loading high-severity issues...
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

            <div className="wide-card-header severity-header">

                <div className="severity-title">

                    <AlertTriangle
                        size={20}
                    />

                    <h2>
                        High-Severity Issues
                    </h2>

                </div>

                <span className="table-count">
                    {issues.length} shown
                </span>

            </div>


            <div className="table-scroll">

                <table className="analytics-table">

                    <thead>
                        <tr>

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
                                Platform
                            </th>

                            <th>
                                Severity
                            </th>

                        </tr>
                    </thead>


                    <tbody>

                        {issues.map(
                            (issue) => (
                                <tr
                                    key={
                                        issue.id
                                    }
                                >

                                    <td className="content-cell">
                                        {
                                            issue.content_text
                                        }
                                    </td>


                                    <td>
                                        {
                                            formatLabel(
                                                issue.topic
                                            )
                                        }
                                    </td>


                                    <td>
                                        {
                                            formatLabel(
                                                issue.intent
                                            )
                                        }
                                    </td>


                                    <td>

                                        <div className="table-platform">

                                            <img
                                                src={
                                                    PLATFORM_LOGOS[
                                                        issue.platform
                                                    ]
                                                }
                                                alt={
                                                    issue.platform
                                                }
                                                className="table-platform-logo"
                                            />

                                            <span>
                                                {
                                                    formatLabel(
                                                        issue.platform
                                                    )
                                                }
                                            </span>

                                        </div>

                                    </td>


                                    <td>

                                        <span className="severity-badge severity-high">
                                            High
                                        </span>

                                    </td>

                                </tr>
                            )
                        )}

                    </tbody>

                </table>

            </div>

        </div>
    )
}


export default HighSeverityTable