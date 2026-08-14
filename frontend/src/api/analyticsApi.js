const API_BASE_URL = "http://127.0.0.1:8000"


function buildQueryString(filters = {}) {
    const params = new URLSearchParams()

    if (filters.dateFrom) {
        params.set(
            "date_from",
            filters.dateFrom
        )
    }

    if (filters.dateTo) {
        params.set(
            "date_to",
            filters.dateTo
        )
    }

    if (filters.platform) {
        params.set(
            "platform",
            filters.platform
        )
    }

    if (filters.postTopic) {
        params.set(
            "post_topic",
            filters.postTopic
        )
    }

    if (filters.topic) {
        params.set(
            "topic",
            filters.topic
        )
    }

    if (filters.sentiment) {
        params.set(
            "sentiment",
            filters.sentiment
        )
    }

    if (filters.intent) {
        params.set(
            "intent",
            filters.intent
        )
    }

    if (filters.severity) {
        params.set(
            "severity",
            filters.severity
        )
    }

    const query = params.toString()

    return query
        ? `?${query}`
        : ""
}


export async function getSummary(
    filters = {}
) {
    const query =
        buildQueryString(filters)

    const response = await fetch(
        `${API_BASE_URL}/api/summary${query}`
    )

    if (!response.ok) {
        throw new Error(
            "Failed to load dashboard summary."
        )
    }

    return response.json()
}


export async function getSentimentDistribution(
    filters = {}
) {
    const query =
        buildQueryString(filters)

    const response = await fetch(
        `${API_BASE_URL}/api/sentiment${query}`
    )

    if (!response.ok) {
        throw new Error(
            "Failed to load sentiment distribution."
        )
    }

    return response.json()
}


export async function getTopics(
    filters = {}
) {
    const query =
        buildQueryString(filters)

    const response = await fetch(
        `${API_BASE_URL}/api/topics${query}`
    )

    if (!response.ok) {
        throw new Error(
            "Failed to load topics."
        )
    }

    return response.json()
}


export async function getIntents(
    filters = {}
) {
    const query =
        buildQueryString(filters)

    const response = await fetch(
        `${API_BASE_URL}/api/intents${query}`
    )

    if (!response.ok) {
        throw new Error(
            "Failed to load intents."
        )
    }

    return response.json()
}


export async function getPlatforms(
    filters = {}
) {
    const query =
        buildQueryString(filters)

    const response = await fetch(
        `${API_BASE_URL}/api/platforms${query}`
    )

    if (!response.ok) {
        throw new Error(
            "Failed to load platform distribution."
        )
    }

    return response.json()
}


export async function getSentimentOverTime(
    filters = {}
) {
    const query =
        buildQueryString(filters)

    const response = await fetch(
        `${API_BASE_URL}/api/sentiment-over-time${query}`
    )

    if (!response.ok) {
        throw new Error(
            "Failed to load sentiment over time."
        )
    }

    return response.json()
}


export async function getHighSeverity(
    filters = {}
) {
    const query =
        buildQueryString(filters)

    const response = await fetch(
        `${API_BASE_URL}/api/high-severity${query}`
    )

    if (!response.ok) {
        throw new Error(
            "Failed to load high-severity issues."
        )
    }

    return response.json()
}


export async function getRecentAnalysis(
    filters = {}
) {
    const query =
        buildQueryString(filters)

    const response = await fetch(
        `${API_BASE_URL}/api/recent-analysis${query}`
    )

    if (!response.ok) {
        throw new Error(
            "Failed to load recent analysis."
        )
    }

    return response.json()
}
export async function getComments({
    page = 1,
    pageSize = 20,
    search = "",
    platform = "",
    contentType = "",
    postTopic = "",
    topic = "",
    sentiment = "",
    intent = "",
    severity = "",
} = {}) {
    const params = new URLSearchParams()

    params.set(
        "page",
        page
    )

    params.set(
        "page_size",
        pageSize
    )


    if (search) {
        params.set(
            "search",
            search
        )
    }


    if (platform) {
        params.set(
            "platform",
            platform
        )
    }


    if (contentType) {
        params.set(
            "content_type",
            contentType
        )
    }


    if (postTopic) {
        params.set(
            "post_topic",
            postTopic
        )
    }


    if (topic) {
        params.set(
            "topic",
            topic
        )
    }


    if (sentiment) {
        params.set(
            "sentiment",
            sentiment
        )
    }


    if (intent) {
        params.set(
            "intent",
            intent
        )
    }


    if (severity) {
        params.set(
            "severity",
            severity
        )
    }


    const response = await fetch(
        `${API_BASE_URL}/api/comments?${params.toString()}`
    )


    if (!response.ok) {
        throw new Error(
            "Failed to load comments."
        )
    }


    return response.json()
}

export async function getAnalyticsVolumeOverTime() {
    const response = await fetch(
        `${API_BASE_URL}/api/analytics/volume-over-time`
    )

    if (!response.ok) {
        throw new Error(
            "Failed to load interaction volume."
        )
    }

    return response.json()
}


export async function getAnalyticsIssuesOverTime() {
    const response = await fetch(
        `${API_BASE_URL}/api/analytics/issues-over-time`
    )

    if (!response.ok) {
        throw new Error(
            "Failed to load issue trends."
        )
    }

    return response.json()
}


export async function getAnalyticsPlatformComparison() {
    const response = await fetch(
        `${API_BASE_URL}/api/analytics/platform-comparison`
    )

    if (!response.ok) {
        throw new Error(
            "Failed to load platform comparison."
        )
    }

    return response.json()
}

export async function getAnalyticsTopicDistribution() {
    const response = await fetch(
        `${API_BASE_URL}/api/analytics/topic-distribution`
    )

    if (!response.ok) {
        throw new Error(
            "Failed to load topic distribution."
        )
    }

    return response.json()
}

export async function getAnalyticsTopicSeverity() {
    const response = await fetch(
        `${API_BASE_URL}/api/analytics/topic-severity`
    )

    if (!response.ok) {
        throw new Error(
            "Failed to load topic severity."
        )
    }

    return response.json()
}

export async function getAnalyticsEngagementByPlatform() {
    const response = await fetch(
        `${API_BASE_URL}/api/analytics/engagement-by-platform`
    )

    if (!response.ok) {
        throw new Error(
            "Failed to load platform engagement."
        )
    }

    return response.json()
}


export async function getAnalyticsTopicsToWorkOn() {
    const response = await fetch(
        `${API_BASE_URL}/api/analytics/topics-to-work-on`
    )

    if (!response.ok) {
        throw new Error(
            "Failed to load priority topics."
        )
    }

    return response.json()
}