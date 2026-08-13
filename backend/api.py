import os

import pymysql
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


load_dotenv()


def require_env(name: str) -> str:
    value = os.getenv(name)

    if value is None or not value.strip():
        raise RuntimeError(
            f"Missing required environment variable: {name}"
        )

    return value.strip()


DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_NAME = require_env("DB_NAME")
DB_USER = require_env("DB_USER")
DB_PASSWORD = require_env("DB_PASSWORD")


app = FastAPI(
    title="TouchBoard API",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_database_connection():
    return pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
    )

def build_filter_clause(
    date_from: str | None = None,
    date_to: str | None = None,
    platform: str | None = None,
    post_topic: str | None = None,
    topic: str | None = None,
    sentiment: str | None = None,
    intent: str | None = None,
    severity: str | None = None,
):
    conditions = []
    params = {}

    if date_from:
        conditions.append(
            "DATE(c.published_at) >= %(date_from)s"
        )
        params["date_from"] = date_from

    if date_to:
        conditions.append(
            "DATE(c.published_at) <= %(date_to)s"
        )
        params["date_to"] = date_to

    if platform:
        conditions.append(
            "c.platform = %(platform)s"
        )
        params["platform"] = platform

    if post_topic:
        conditions.append(
            "a.post_topic = %(post_topic)s"
        )
        params["post_topic"] = post_topic

    if topic:
        conditions.append(
            "a.topic = %(topic)s"
        )
        params["topic"] = topic

    if sentiment:
        conditions.append(
            "a.sentiment = %(sentiment)s"
        )
        params["sentiment"] = sentiment

    if intent:
        conditions.append(
            "a.intent = %(intent)s"
        )
        params["intent"] = intent

    if severity:
        conditions.append(
            "a.severity = %(severity)s"
        )
        params["severity"] = severity

    if conditions:
        where_clause = (
            " WHERE "
            + " AND ".join(conditions)
        )
    else:
        where_clause = ""

    return where_clause, params

@app.get("/")
def root():
    return {
        "message": "TouchBoard API is running"
    }


@app.get("/api/summary")
def get_summary(
    date_from: str | None = None,
    date_to: str | None = None,
    platform: str | None = None,
    post_topic: str | None = None,
    topic: str | None = None,
    sentiment: str | None = None,
    intent: str | None = None,
    severity: str | None = None,
):
    where_clause, params = build_filter_clause(
        date_from=date_from,
        date_to=date_to,
        platform=platform,
        post_topic=post_topic,
        topic=topic,
        sentiment=sentiment,
        intent=intent,
        severity=severity,
    )

    connection = get_database_connection()

    try:
        with connection.cursor() as cursor:
            sql = f"""
                SELECT
                    COUNT(c.id) AS total_content,

                    SUM(
                        CASE
                            WHEN a.sentiment = 'negative'
                            THEN 1
                            ELSE 0
                        END
                    ) AS negative_count,

                    SUM(
                        CASE
                            WHEN a.intent = 'complaint'
                            THEN 1
                            ELSE 0
                        END
                    ) AS complaints,

                    SUM(
                        CASE
                            WHEN a.severity = 'high'
                            THEN 1
                            ELSE 0
                        END
                    ) AS high_severity

                FROM content AS c

                JOIN content_analysis AS a
                    ON a.content_id = c.id

                {where_clause}
            """

            cursor.execute(
                sql,
                params,
            )

            row = cursor.fetchone()

    finally:
        connection.close()

    total_content = int(
        row["total_content"] or 0
    )

    negative_count = int(
        row["negative_count"] or 0
    )

    complaints = int(
        row["complaints"] or 0
    )

    high_severity = int(
        row["high_severity"] or 0
    )

    if total_content > 0:
        negative_percentage = round(
            (
                negative_count
                / total_content
            )
            * 100,
            1,
        )
    else:
        negative_percentage = 0.0

    return {
        "total_content": total_content,
        "negative_percentage": negative_percentage,
        "complaints": complaints,
        "high_severity": high_severity,
    }

@app.get("/api/sentiment")
def get_sentiment_distribution(
    date_from: str | None = None,
    date_to: str | None = None,
    platform: str | None = None,
    post_topic: str | None = None,
    topic: str | None = None,
    sentiment: str | None = None,
    intent: str | None = None,
    severity: str | None = None,
):
    where_clause, params = build_filter_clause(
        date_from=date_from,
        date_to=date_to,
        platform=platform,
        post_topic=post_topic,
        topic=topic,
        sentiment=sentiment,
        intent=intent,
        severity=severity,
    )

    connection = get_database_connection()

    try:
        with connection.cursor() as cursor:
            sql = f"""
                SELECT
                    SUM(
                        CASE
                            WHEN a.sentiment = 'positive'
                            THEN 1
                            ELSE 0
                        END
                    ) AS positive,

                    SUM(
                        CASE
                            WHEN a.sentiment = 'neutral'
                            THEN 1
                            ELSE 0
                        END
                    ) AS neutral,

                    SUM(
                        CASE
                            WHEN a.sentiment = 'negative'
                            THEN 1
                            ELSE 0
                        END
                    ) AS negative

                FROM content AS c

                JOIN content_analysis AS a
                    ON a.content_id = c.id

                {where_clause}
            """

            cursor.execute(
                sql,
                params,
            )

            row = cursor.fetchone()

    finally:
        connection.close()

    positive = int(
        row["positive"] or 0
    )

    neutral = int(
        row["neutral"] or 0
    )

    negative = int(
        row["negative"] or 0
    )

    total = (
        positive
        + neutral
        + negative
    )

    def percentage(value):
        if total == 0:
            return 0.0

        return round(
            (value / total) * 100,
            1,
        )

    return {
        "total": total,

        "sentiments": [
            {
                "sentiment": "positive",
                "count": positive,
                "percentage": percentage(
                    positive
                ),
            },
            {
                "sentiment": "neutral",
                "count": neutral,
                "percentage": percentage(
                    neutral
                ),
            },
            {
                "sentiment": "negative",
                "count": negative,
                "percentage": percentage(
                    negative
                ),
            },
        ],
    }

@app.get("/api/topics")
def get_top_topics(
    date_from: str | None = None,
    date_to: str | None = None,
    platform: str | None = None,
    post_topic: str | None = None,
    topic: str | None = None,
    sentiment: str | None = None,
    intent: str | None = None,
    severity: str | None = None,
):
    where_clause, params = build_filter_clause(
        date_from=date_from,
        date_to=date_to,
        platform=platform,
        post_topic=post_topic,
        topic=topic,
        sentiment=sentiment,
        intent=intent,
        severity=severity,
    )

    connection = get_database_connection()

    try:
        with connection.cursor() as cursor:
            sql = f"""
                SELECT
                    a.topic,
                    COUNT(*) AS count

                FROM content AS c

                JOIN content_analysis AS a
                    ON a.content_id = c.id

                {where_clause}

                GROUP BY a.topic

                ORDER BY count DESC
            """

            cursor.execute(
                sql,
                params,
            )

            rows = cursor.fetchall()

    finally:
        connection.close()

    return {
        "topics": [
            {
                "topic": row["topic"],
                "count": int(
                    row["count"] or 0
                ),
            }
            for row in rows
        ]
    }

@app.get("/api/intents")
def get_intent_distribution(
    date_from: str | None = None,
    date_to: str | None = None,
    platform: str | None = None,
    post_topic: str | None = None,
    topic: str | None = None,
    sentiment: str | None = None,
    intent: str | None = None,
    severity: str | None = None,
):
    where_clause, params = build_filter_clause(
        date_from=date_from,
        date_to=date_to,
        platform=platform,
        post_topic=post_topic,
        topic=topic,
        sentiment=sentiment,
        intent=intent,
        severity=severity,
    )

    connection = get_database_connection()

    try:
        with connection.cursor() as cursor:
            sql = f"""
                SELECT
                    a.intent,
                    COUNT(*) AS count

                FROM content AS c

                JOIN content_analysis AS a
                    ON a.content_id = c.id

                {where_clause}

                GROUP BY a.intent

                ORDER BY count DESC
            """

            cursor.execute(
                sql,
                params,
            )

            rows = cursor.fetchall()

    finally:
        connection.close()

    return {
        "intents": [
            {
                "intent": row["intent"],
                "count": int(
                    row["count"] or 0
                ),
            }
            for row in rows
        ]
    }

@app.get("/api/platforms")
def get_platform_distribution(
    date_from: str | None = None,
    date_to: str | None = None,
    platform: str | None = None,
    post_topic: str | None = None,
    topic: str | None = None,
    sentiment: str | None = None,
    intent: str | None = None,
    severity: str | None = None,
):
    where_clause, params = build_filter_clause(
        date_from=date_from,
        date_to=date_to,
        platform=platform,
        post_topic=post_topic,
        topic=topic,
        sentiment=sentiment,
        intent=intent,
        severity=severity,
    )

    connection = get_database_connection()

    try:
        with connection.cursor() as cursor:
            sql = f"""
                SELECT
                    c.platform,
                    COUNT(*) AS count

                FROM content AS c

                JOIN content_analysis AS a
                    ON a.content_id = c.id

                {where_clause}

                GROUP BY c.platform

                ORDER BY count DESC
            """

            cursor.execute(
                sql,
                params,
            )

            rows = cursor.fetchall()

    finally:
        connection.close()

    total = sum(
        int(row["count"] or 0)
        for row in rows
    )

    platforms = []

    for row in rows:
        count = int(
            row["count"] or 0
        )

        percentage = (
            round(
                (count / total) * 100,
                1,
            )
            if total > 0
            else 0.0
        )

        platforms.append(
            {
                "platform": row["platform"],
                "count": count,
                "percentage": percentage,
            }
        )

    return {
        "total": total,
        "platforms": platforms,
    }

@app.get("/api/sentiment-over-time")
def get_sentiment_over_time(
    date_from: str | None = None,
    date_to: str | None = None,
    platform: str | None = None,
    post_topic: str | None = None,
    topic: str | None = None,
    sentiment: str | None = None,
    intent: str | None = None,
    severity: str | None = None,
):
    where_clause, params = build_filter_clause(
        date_from=date_from,
        date_to=date_to,
        platform=platform,
        post_topic=post_topic,
        topic=topic,
        sentiment=sentiment,
        intent=intent,
        severity=severity,
    )

    connection = get_database_connection()

    try:
        with connection.cursor() as cursor:
            sql = f"""
                SELECT
                    DATE(c.published_at) AS date,

                    COUNT(c.id) AS total,

                    SUM(
                        CASE
                            WHEN a.sentiment = 'positive'
                            THEN 1
                            ELSE 0
                        END
                    ) AS positive,

                    SUM(
                        CASE
                            WHEN a.sentiment = 'neutral'
                            THEN 1
                            ELSE 0
                        END
                    ) AS neutral,

                    SUM(
                        CASE
                            WHEN a.sentiment = 'negative'
                            THEN 1
                            ELSE 0
                        END
                    ) AS negative

                FROM content AS c

                JOIN content_analysis AS a
                    ON a.content_id = c.id

                {where_clause}

                GROUP BY DATE(c.published_at)

                ORDER BY DATE(c.published_at)
            """

            cursor.execute(
                sql,
                params,
            )

            rows = cursor.fetchall()

    finally:
        connection.close()


    data = []

    for row in rows:
        data.append(
            {
                "date": (
                    row["date"].isoformat()
                    if row["date"]
                    else None
                ),

                "total": int(
                    row["total"] or 0
                ),

                "positive": int(
                    row["positive"] or 0
                ),

                "neutral": int(
                    row["neutral"] or 0
                ),

                "negative": int(
                    row["negative"] or 0
                ),
            }
        )


    return {
        "data": data
    }

@app.get("/api/high-severity")
def get_high_severity(
    date_from: str | None = None,
    date_to: str | None = None,
    platform: str | None = None,
    post_topic: str | None = None,
    topic: str | None = None,
    sentiment: str | None = None,
    intent: str | None = None,
    severity: str | None = None,
):
    where_clause, params = build_filter_clause(
        date_from=date_from,
        date_to=date_to,
        platform=platform,
        post_topic=post_topic,
        topic=topic,
        sentiment=sentiment,
        intent=intent,
        severity=severity,
    )


    if where_clause:
        where_clause += (
            " AND a.severity = 'high'"
        )
    else:
        where_clause = (
            " WHERE a.severity = 'high'"
        )


    connection = get_database_connection()

    try:
        with connection.cursor() as cursor:
            sql = f"""
                SELECT
                    c.id,
                    c.platform,
                    c.content_type,
                    c.content_text,
                    c.published_at,

                    a.topic,
                    a.intent,
                    a.sentiment,
                    a.severity,
                    a.confidence

                FROM content AS c

                JOIN content_analysis AS a
                    ON a.content_id = c.id

                {where_clause}

                ORDER BY c.published_at DESC

                LIMIT 10
            """

            cursor.execute(
                sql,
                params,
            )

            rows = cursor.fetchall()

    finally:
        connection.close()


    issues = []

    for row in rows:
        issues.append(
            {
                "id": row["id"],

                "platform":
                    row["platform"],

                "content_type":
                    row["content_type"],

                "content_text":
                    row["content_text"],

                "published_at": (
                    row["published_at"].isoformat()
                    if row["published_at"]
                    else None
                ),

                "topic":
                    row["topic"],

                "intent":
                    row["intent"],

                "sentiment":
                    row["sentiment"],

                "severity":
                    row["severity"],

                "confidence": float(
                    row["confidence"] or 0
                ),
            }
        )


    return {
        "issues": issues
    }


@app.get("/api/recent-analysis")
def get_recent_analysis(
    date_from: str | None = None,
    date_to: str | None = None,
    platform: str | None = None,
    post_topic: str | None = None,
    topic: str | None = None,
    sentiment: str | None = None,
    intent: str | None = None,
    severity: str | None = None,
):
    where_clause, params = build_filter_clause(
        date_from=date_from,
        date_to=date_to,
        platform=platform,
        post_topic=post_topic,
        topic=topic,
        sentiment=sentiment,
        intent=intent,
        severity=severity,
    )


    connection = get_database_connection()

    try:
        with connection.cursor() as cursor:
            sql = f"""
                SELECT
                    c.id,
                    c.platform,
                    c.content_type,
                    c.content_text,
                    c.source_post_text,
                    c.published_at,

                    a.post_topic,
                    a.topic,
                    a.intent,
                    a.sentiment,
                    a.severity,
                    a.confidence

                FROM content AS c

                JOIN content_analysis AS a
                    ON a.content_id = c.id

                {where_clause}

                ORDER BY c.published_at DESC

                LIMIT 12
            """

            cursor.execute(
                sql,
                params,
            )

            rows = cursor.fetchall()

    finally:
        connection.close()


    content = []

    for row in rows:
        content.append(
            {
                "id":
                    row["id"],

                "platform":
                    row["platform"],

                "content_type":
                    row["content_type"],

                "content_text":
                    row["content_text"],

                "source_post_text":
                    row["source_post_text"],

                "published_at": (
                    row["published_at"].isoformat()
                    if row["published_at"]
                    else None
                ),

                "post_topic":
                    row["post_topic"],

                "topic":
                    row["topic"],

                "intent":
                    row["intent"],

                "sentiment":
                    row["sentiment"],

                "severity":
                    row["severity"],

                "confidence": float(
                    row["confidence"] or 0
                ),
            }
        )


    return {
        "content": content
    }