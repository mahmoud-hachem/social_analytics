const API_BASE_URL = "http://127.0.0.1:8000"


export async function getSummary() {
    const response = await fetch(
        `${API_BASE_URL}/api/summary`
    )

    if (!response.ok) {
        throw new Error(
            "Failed to load dashboard summary."
        )
    }

    return response.json()
}

export async function getSentimentDistribution() {
    const response = await fetch(
        `${API_BASE_URL}/api/sentiment`
    )

    if (!response.ok) {
        throw new Error(
            "Failed to load sentiment distribution."
        )
    }

    return response.json()
}

export async function getTopics() {
    const response = await fetch(
        `${API_BASE_URL}/api/topics`
    )

    if (!response.ok) {
        throw new Error(
            "Failed to load topics."
        )
    }

    return response.json()
}

export async function getIntents() {
    const response = await fetch(
        `${API_BASE_URL}/api/intents`
    )

    if (!response.ok) {
        throw new Error(
            "Failed to load intents."
        )
    }

    return response.json()
}