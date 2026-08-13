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