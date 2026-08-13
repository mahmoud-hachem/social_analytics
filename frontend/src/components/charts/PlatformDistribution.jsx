import {
    useEffect,
    useState,
} from "react"

import {
    getPlatforms,
} from "../../api/analyticsApi.js"

import facebookLogo
    from "../../assets/facebook-logo.png"

import instagramLogo
    from "../../assets/instagram-logo.png"


const PLATFORM_CONFIG = {
    facebook: {
        label: "Facebook",
        logo: facebookLogo,
    },

    instagram: {
        label: "Instagram",
        logo: instagramLogo,
    },
}


function PlatformDistribution({
    filters,
}) {
    const [
        data,
        setData,
    ] = useState(null)

    const [
        loading,
        setLoading,
    ] = useState(true)

    const [
        error,
        setError,
    ] = useState(null)


    useEffect(() => {
        async function loadPlatforms() {
            try {
                setLoading(true)
                setError(null)

                const result =
                    await getPlatforms(
                        filters
                    )

                setData(result)

            } catch (err) {
                setError(err.message)

            } finally {
                setLoading(false)
            }
        }

        loadPlatforms()

    }, [filters])


    if (loading) {
        return (
            <div className="chart-card">
                <div className="chart-status">
                    Loading platforms...
                </div>
            </div>
        )
    }


    if (error) {
        return (
            <div className="chart-card">
                <div className="chart-status chart-error">
                    {error}
                </div>
            </div>
        )
    }


    if (
        !data ||
        !data.platforms
    ) {
        return (
            <div className="chart-card">
                <div className="chart-status">
                    No platform data available.
                </div>
            </div>
        )
    }


    return (
        <div className="chart-card">

            <div className="chart-card-header">

                <div>
                    <h2>
                        Platform Distribution
                    </h2>

                    <p>
                        Collected content by social platform.
                    </p>
                </div>

            </div>


            <div className="platform-distribution">

                {data.platforms.map(
                    (item) => {

                        const config =
                            PLATFORM_CONFIG[
                                item.platform
                            ]

                        if (!config) {
                            return null
                        }


                        return (
                            <div
                                className="platform-item"
                                key={
                                    item.platform
                                }
                            >

                                <div className="platform-item-header">

                                    <div className="platform-name-group">

                                        <div className="platform-logo-container">

                                            <img
                                                src={
                                                    config.logo
                                                }
                                                alt={
                                                    `${config.label} logo`
                                                }
                                                className="platform-logo"
                                            />

                                        </div>


                                        <span className="platform-name">
                                            {
                                                config.label
                                            }
                                        </span>

                                    </div>


                                    <strong className="platform-percentage">
                                        {
                                            item.percentage
                                        }%
                                    </strong>

                                </div>


                                <div className="platform-count">
                                    {
                                        item.count
                                    } content items
                                </div>


                                <div className="platform-progress">

                                    <div
                                        className="platform-progress-fill"
                                        style={{
                                            width:
                                                `${item.percentage}%`,
                                        }}
                                    />

                                </div>

                            </div>
                        )
                    }
                )}

            </div>


            <div className="platform-total">

                <span>
                    Total collected content
                </span>

                <strong>
                    {data.total}
                </strong>

            </div>

        </div>
    )
}


export default PlatformDistribution