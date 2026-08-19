import os
import time

import pymysql
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import BackgroundTasks, HTTPException

from topic_insights import (
    get_overview_topic_insights,
    refresh_topic_insights_for_post,
)
from facebook_collector import (
    fetch_all_posts as fb_fetch_all_posts,
    fetch_all_comments as fb_fetch_all_comments,
    fetch_comment_replies as fb_fetch_comment_replies,
    normalize_comment as fb_normalize_comment,
    normalize_reply as fb_normalize_reply,
    save_comments as fb_save_comments,
)

from instagram_collector import (
    fetch_all_media as ig_fetch_all_media,
    fetch_all_comments as ig_fetch_all_comments,
    normalize_comment as ig_normalize_comment,
    normalize_reply as ig_normalize_reply,
    save_comments as ig_save_comments,
)

from content_analyzer import (
    analyze_text_with_gemini,
    save_analysis,
    get_database_connection as get_analysis_database_connection,
)

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

@app.get("/api/comments")
def get_comments(
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    platform: str | None = None,
    content_type: str | None = None,
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


    if content_type:
        conditions.append(
            "c.content_type = %(content_type)s"
        )

        params["content_type"] = content_type


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


    if search:
        conditions.append(
            """
            (
                c.content_text LIKE %(search)s
                OR c.source_post_text LIKE %(search)s
            )
            """
        )

        params["search"] = (
            f"%{search}%"
        )


    if conditions:
        where_clause = (
            " WHERE "
            + " AND ".join(
                conditions
            )
        )
    else:
        where_clause = ""


    if page < 1:
        page = 1


    if page_size < 1:
        page_size = 20


    if page_size > 100:
        page_size = 100


    offset = (
        page - 1
    ) * page_size


    connection = get_database_connection()


    try:
        with connection.cursor() as cursor:

            count_sql = f"""
                SELECT
                    COUNT(*) AS total

                FROM content AS c

                JOIN content_analysis AS a
                    ON a.content_id = c.id

                {where_clause}
            """


            cursor.execute(
                count_sql,
                params,
            )


            count_row = cursor.fetchone()


            total = int(
                count_row["total"]
                or 0
            )


            data_sql = f"""
                SELECT
                    c.id,
                    c.external_id,
                    c.platform,
                    c.content_type,
                    c.source_post_id,
                    c.source_post_text,
                    c.parent_external_id,
                    c.content_text,
                    c.published_at,
                    c.likes_count,

                    a.language,
                    a.post_topic,
                    a.sentiment,
                    a.topic,
                    a.intent,
                    a.severity,
                    a.confidence

                FROM content AS c

                JOIN content_analysis AS a
                    ON a.content_id = c.id

                {where_clause}

                ORDER BY
                    c.published_at DESC,
                    c.id DESC

                LIMIT %(page_size)s
                OFFSET %(offset)s
            """


            data_params = {
                **params,
                "page_size": page_size,
                "offset": offset,
            }


            cursor.execute(
                data_sql,
                data_params,
            )


            rows = cursor.fetchall()


    finally:
        connection.close()


    comments = []


    for row in rows:
        comments.append(
            {
                "id":
                    row["id"],

                "external_id":
                    row["external_id"],

                "platform":
                    row["platform"],

                "content_type":
                    row["content_type"],

                "source_post_id":
                    row["source_post_id"],

                "source_post_text":
                    row["source_post_text"],

                "parent_external_id":
                    row[
                        "parent_external_id"
                    ],

                "content_text":
                    row["content_text"],

                "published_at": (
                    row[
                        "published_at"
                    ].isoformat()
                    if row[
                        "published_at"
                    ]
                    else None
                ),

                "likes_count":
                    int(
                        row[
                            "likes_count"
                        ]
                        or 0
                    ),

                "language":
                    row["language"],

                "post_topic":
                    row["post_topic"],

                "sentiment":
                    row["sentiment"],

                "topic":
                    row["topic"],

                "intent":
                    row["intent"],

                "severity":
                    row["severity"],

                "confidence":
                    float(
                        row[
                            "confidence"
                        ]
                        or 0
                    ),
            }
        )


    total_pages = (
        (
            total
            + page_size
            - 1
        )
        // page_size
    )


    return {
        "comments": comments,

        "pagination": {
            "page":
                page,

            "page_size":
                page_size,

            "total":
                total,

            "total_pages":
                total_pages,
        },
    }

@app.get("/api/analytics/volume-over-time")
def get_volume_over_time(
    date_from: str | None = None,
    date_to: str | None = None,
    platform: str | None = None,
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

    if conditions:
        where_clause = (
            " WHERE "
            + " AND ".join(conditions)
        )
    else:
        where_clause = ""

    connection = get_database_connection()

    try:
        with connection.cursor() as cursor:
            sql = f"""
                SELECT
                    DATE(c.published_at) AS date,
                    COUNT(*) AS count

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

    return {
        "data": [
            {
                "date": (
                    row["date"].isoformat()
                    if row["date"]
                    else None
                ),
                "count": int(
                    row["count"] or 0
                ),
            }
            for row in rows
        ]
    }


@app.get("/api/analytics/issues-over-time")
def get_issues_over_time(
    date_from: str | None = None,
    date_to: str | None = None,
    platform: str | None = None,
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

    if conditions:
        where_clause = (
            " WHERE "
            + " AND ".join(conditions)
        )
    else:
        where_clause = ""

    connection = get_database_connection()

    try:
        with connection.cursor() as cursor:
            sql = f"""
                SELECT
                    DATE(c.published_at) AS date,

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

    return {
        "data": [
            {
                "date": (
                    row["date"].isoformat()
                    if row["date"]
                    else None
                ),
                "complaints": int(
                    row["complaints"] or 0
                ),
                "high_severity": int(
                    row["high_severity"] or 0
                ),
            }
            for row in rows
        ]
    }


@app.get("/api/analytics/platform-comparison")
def get_platform_comparison():
    connection = get_database_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    c.platform,

                    COUNT(*) AS total_content,

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

                GROUP BY c.platform

                ORDER BY c.platform
                """
            )

            rows = cursor.fetchall()

    finally:
        connection.close()

    platforms = []

    for row in rows:
        total = int(
            row["total_content"] or 0
        )

        negative_count = int(
            row["negative_count"] or 0
        )

        if total > 0:
            negative_percentage = round(
                (
                    negative_count
                    / total
                )
                * 100,
                1,
            )
        else:
            negative_percentage = 0.0

        platforms.append(
            {
                "platform":
                    row["platform"],

                "total_content":
                    total,

                "negative_percentage":
                    negative_percentage,

                "complaints":
                    int(
                        row["complaints"]
                        or 0
                    ),

                "high_severity":
                    int(
                        row["high_severity"]
                        or 0
                    ),
            }
        )

    return {
        "platforms": platforms
    }

@app.get("/api/analytics/topic-distribution")
def get_topic_distribution():
    connection = get_database_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    a.topic,
                    COUNT(*) AS count

                FROM content AS c

                JOIN content_analysis AS a
                    ON a.content_id = c.id

                GROUP BY a.topic

                ORDER BY count DESC
                """
            )

            rows = cursor.fetchall()

    finally:
        connection.close()


    total = sum(
        int(row["count"] or 0)
        for row in rows
    )


    topics = []

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

        topics.append(
            {
                "topic": row["topic"],
                "count": count,
                "percentage": percentage,
            }
        )


    return {
        "total": total,
        "topics": topics,
    }

@app.get("/api/analytics/topic-severity")
def get_topic_severity():
    connection = get_database_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    a.topic,

                    SUM(
                        CASE
                            WHEN a.severity = 'low'
                            THEN 1
                            ELSE 0
                        END
                    ) AS low_count,

                    SUM(
                        CASE
                            WHEN a.severity = 'medium'
                            THEN 1
                            ELSE 0
                        END
                    ) AS medium_count,

                    SUM(
                        CASE
                            WHEN a.severity = 'high'
                            THEN 1
                            ELSE 0
                        END
                    ) AS high_count

                FROM content AS c

                JOIN content_analysis AS a
                    ON a.content_id = c.id

                GROUP BY a.topic

                ORDER BY
                    high_count DESC,
                    medium_count DESC,
                    low_count DESC
                """
            )

            rows = cursor.fetchall()

    finally:
        connection.close()


    topics = []

    for row in rows:
        topics.append(
            {
                "topic":
                    row["topic"],

                "low":
                    int(
                        row["low_count"]
                        or 0
                    ),

                "medium":
                    int(
                        row["medium_count"]
                        or 0
                    ),

                "high":
                    int(
                        row["high_count"]
                        or 0
                    ),
            }
        )


    return {
        "topics": topics
    }

@app.get("/api/analytics/engagement-by-platform")
def get_engagement_by_platform():
    connection = get_database_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    c.platform,
                    COUNT(*) AS interaction_count

                FROM content AS c

                JOIN content_analysis AS a
                    ON a.content_id = c.id

                GROUP BY c.platform

                ORDER BY interaction_count DESC
                """
            )

            rows = cursor.fetchall()

    finally:
        connection.close()


    total = sum(
        int(
            row["interaction_count"]
            or 0
        )
        for row in rows
    )


    platforms = []

    for row in rows:
        count = int(
            row["interaction_count"]
            or 0
        )

        percentage = (
            round(
                (
                    count
                    / total
                )
                * 100,
                1,
            )
            if total > 0
            else 0.0
        )

        platforms.append(
            {
                "platform":
                    row["platform"],

                "count":
                    count,

                "percentage":
                    percentage,
            }
        )


    return {
        "total": total,
        "platforms": platforms,
    }

@app.get("/api/analytics/topics-to-work-on")
def get_topics_to_work_on():
    connection = get_database_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    a.topic,

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

                GROUP BY a.topic

                HAVING
                    complaints > 0
                    OR high_severity > 0

                ORDER BY
                    (
                        complaints
                        + (
                            high_severity
                            * 2
                        )
                    ) DESC
                """
            )

            rows = cursor.fetchall()

    finally:
        connection.close()


    topics = []

    for row in rows:
        complaints = int(
            row["complaints"]
            or 0
        )

        high_severity = int(
            row["high_severity"]
            or 0
        )

        priority_score = (
            complaints
            + (
                high_severity
                * 2
            )
        )


        if priority_score >= 10:
            priority = "critical"

        elif priority_score >= 6:
            priority = "high"

        elif priority_score >= 3:
            priority = "medium"

        else:
            priority = "low"


        topics.append(
            {
                "topic":
                    row["topic"],

                "complaints":
                    complaints,

                "high_severity":
                    high_severity,

                "priority_score":
                    priority_score,

                "priority":
                    priority,
            }
        )


    return {
        "topics":
            topics[:6]
    }

@app.get("/api/collection/facebook/posts")
def get_facebook_posts():
    posts = fb_fetch_all_posts()

    return {
        "platform": "facebook",
        "posts": [
            {
                "id": str(post.get("id", "")),
                "text": str(
                    post.get("message", "")
                ).strip(),
                "created_time": post.get(
                    "created_time"
                ),
            }
            for post in posts
        ],
    }


@app.get("/api/collection/instagram/posts")
def get_instagram_posts():
    media_items = ig_fetch_all_media()

    return {
        "platform": "instagram",
        "posts": [
            {
                "id": str(media.get("id", "")),
                "text": str(
                    media.get("caption", "")
                ).strip(),
                "media_type": media.get(
                    "media_type"
                ),
                "timestamp": media.get(
                    "timestamp"
                ),
                "permalink": media.get(
                    "permalink"
                ),
            }
            for media in media_items
        ],
    }

def analyze_selected_post(
    platform: str,
    source_post_id: str,
) -> int:

    connection = get_analysis_database_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    c.id,
                    c.content_text,
                    c.source_post_text,
                    parent.content_text AS parent_text

                FROM content AS c

                LEFT JOIN content_analysis AS a
                    ON a.content_id = c.id

                LEFT JOIN content AS parent
                    ON parent.platform = c.platform
                    AND parent.external_id = c.parent_external_id

                WHERE
                    c.platform = %s
                    AND c.source_post_id = %s
                    AND a.content_id IS NULL

                ORDER BY c.id
                """,
                (
                    platform,
                    source_post_id,
                ),
            )

            rows = cursor.fetchall()

    finally:
        connection.close()


    print(
        f"Starting background analysis for "
        f"{platform} post {source_post_id}. "
        f"{len(rows)} items need analysis."
    )


    successful = 0

    for index, row in enumerate(rows):

        try:
            analysis = analyze_text_with_gemini(
                text=row["content_text"],
                source_post_text=(
                    row["source_post_text"] or ""
                ),
                parent_text=row["parent_text"],
            )

            save_analysis(
                row["id"],
                analysis,
            )

            successful += 1

            print(
                f"Analyzed content {row['id']}."
            )

        except Exception as exc:
            print(
                f"Failed analysis for "
                f"content {row['id']}: {exc}"
            )

        if index < len(rows) - 1:
            time.sleep(13)


    print(
        f"Finished analysis for "
        f"{platform} post {source_post_id}."
    )

    return successful

def analyze_post_and_refresh_insights(
    platform: str,
    source_post_id: str,
) -> None:

    analyze_selected_post(
        platform,
        source_post_id,
    )

    try:
        refresh_topic_insights_for_post(
            platform,
            source_post_id,
        )

    except Exception as exc:
        print(
            "Topic insight generation failed "
            f"for {platform} "
            f"post {source_post_id}: "
            f"{exc}"
        )
@app.post(
    "/api/collection/facebook/posts/{post_id}/collect"
)
def collect_facebook_post(
    post_id: str,
):

    posts = fb_fetch_all_posts()

    selected_post = next(
        (
            post
            for post in posts
            if str(post.get("id")) == post_id
        ),
        None,
    )

    if selected_post is None:
        raise HTTPException(
            status_code=404,
            detail="Facebook post not found.",
        )


    post_text = str(
        selected_post.get(
            "message",
            "",
        )
    ).strip()


    raw_comments = fb_fetch_all_comments(
        post_id
    )

    normalized_content = []

    comments_count = 0
    replies_count = 0


    for raw_comment in raw_comments:

        normalized_comment = (
            fb_normalize_comment(
                raw_comment,
                post_id,
                post_text,
            )
        )

        if normalized_comment is not None:
            normalized_content.append(
                normalized_comment
            )

            comments_count += 1


        comment_id = str(
            raw_comment["id"]
        )

        raw_replies = (
            fb_fetch_comment_replies(
                comment_id
            )
        )


        for raw_reply in raw_replies:

            normalized_reply = (
                fb_normalize_reply(
                    raw_reply,
                    parent_comment_id=comment_id,
                    post_id=post_id,
                    post_text=post_text,
                )
            )

            if normalized_reply is not None:
                normalized_content.append(
                    normalized_reply
                )

                replies_count += 1


    fb_save_comments(
        normalized_content
    )


    analyzed_items = analyze_post_and_refresh_insights(
    "facebook",
    post_id,
)


    return {
        "status": "success",
        "platform": "facebook",
        "post_id": post_id,
        "comments": comments_count,
        "replies": replies_count,
        "items_processed": (
            comments_count
            + replies_count
        ),
        "analysis_completed": True,
        "analyzed_items": analyzed_items,
    }

@app.post(
    "/api/collection/instagram/posts/{media_id}/collect"
)
def collect_instagram_post(
    media_id: str,
):

    media_items = ig_fetch_all_media()

    selected_media = next(
        (
            media
            for media in media_items
            if str(media.get("id")) == media_id
        ),
        None,
    )

    if selected_media is None:
        raise HTTPException(
            status_code=404,
            detail="Instagram post not found.",
        )


    post_text = str(
        selected_media.get(
            "caption",
            "",
        )
    ).strip()


    raw_comments = ig_fetch_all_comments(
        media_id
    )

    normalized_content = []

    comments_count = 0
    replies_count = 0


    for raw_comment in raw_comments:

        normalized_comment = (
            ig_normalize_comment(
                raw_comment,
                media_id,
                post_text,
            )
        )

        if normalized_comment is not None:
            normalized_content.append(
                normalized_comment
            )

            comments_count += 1


        comment_id = str(
            raw_comment["id"]
        )


        replies = (
            raw_comment
            .get("replies", {})
            .get("data", [])
        )


        for raw_reply in replies:

            normalized_reply = (
                ig_normalize_reply(
                    raw_reply,
                    parent_comment_id=comment_id,
                    media_id=media_id,
                    post_text=post_text,
                )
            )

            if normalized_reply is not None:
                normalized_content.append(
                    normalized_reply
                )

                replies_count += 1


    ig_save_comments(
        normalized_content
    )


    analyzed_items = analyze_post_and_refresh_insights(
    "instagram",
    media_id,
)


    return {
        "status": "success",
        "platform": "instagram",
        "post_id": media_id,
        "comments": comments_count,
        "replies": replies_count,
        "items_processed": (
            comments_count
            + replies_count
        ),
        "analysis_completed": True,
        "analyzed_items": analyzed_items,
    }


def get_collected_external_ids(
    platform: str,
    source_post_id: str,
) -> set[str]:
    connection = get_database_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT external_id
                FROM content
                WHERE platform = %s
                  AND source_post_id = %s
                """,
                (platform, source_post_id),
            )
            rows = cursor.fetchall()
    finally:
        connection.close()

    return {
        str(row["external_id"])
        for row in rows
        if row.get("external_id") is not None
    }


def get_facebook_post_live_status(
    post: dict,
) -> dict:
    post_id = str(post.get("id", ""))
    post_text = str(post.get("message", "")).strip()
    collected_ids = get_collected_external_ids(
        "facebook",
        post_id,
    )

    raw_comments = fb_fetch_all_comments(post_id)

    comments_count = 0
    replies_count = 0
    new_comments = 0
    new_replies = 0

    for raw_comment in raw_comments:
        normalized_comment = fb_normalize_comment(
            raw_comment,
            post_id,
            post_text,
        )

        if normalized_comment is not None:
            comments_count += 1
            if normalized_comment["external_id"] not in collected_ids:
                new_comments += 1

        comment_id = str(raw_comment.get("id", "")).strip()
        if not comment_id:
            continue

        raw_replies = fb_fetch_comment_replies(comment_id)

        for raw_reply in raw_replies:
            normalized_reply = fb_normalize_reply(
                raw_reply,
                parent_comment_id=comment_id,
                post_id=post_id,
                post_text=post_text,
            )

            if normalized_reply is not None:
                replies_count += 1
                if normalized_reply["external_id"] not in collected_ids:
                    new_replies += 1

    return {
        "post_id": post_id,
        "comments": comments_count,
        "replies": replies_count,
        "total_items": comments_count + replies_count,
        "new_comments": new_comments,
        "new_replies": new_replies,
        "new_items": new_comments + new_replies,
    }


def get_instagram_post_live_status(
    media: dict,
) -> dict:
    media_id = str(media.get("id", ""))
    post_text = str(media.get("caption", "")).strip()
    collected_ids = get_collected_external_ids(
        "instagram",
        media_id,
    )

    raw_comments = ig_fetch_all_comments(media_id)

    comments_count = 0
    replies_count = 0
    new_comments = 0
    new_replies = 0

    for raw_comment in raw_comments:
        normalized_comment = ig_normalize_comment(
            raw_comment,
            media_id,
            post_text,
        )

        if normalized_comment is not None:
            comments_count += 1
            if normalized_comment["external_id"] not in collected_ids:
                new_comments += 1

        comment_id = str(raw_comment.get("id", "")).strip()
        replies = (
            raw_comment
            .get("replies", {})
            .get("data", [])
        )

        for raw_reply in replies:
            normalized_reply = ig_normalize_reply(
                raw_reply,
                parent_comment_id=comment_id,
                media_id=media_id,
                post_text=post_text,
            )

            if normalized_reply is not None:
                replies_count += 1
                if normalized_reply["external_id"] not in collected_ids:
                    new_replies += 1

    return {
        "post_id": media_id,
        "comments": comments_count,
        "replies": replies_count,
        "total_items": comments_count + replies_count,
        "new_comments": new_comments,
        "new_replies": new_replies,
        "new_items": new_comments + new_replies,
    }


@app.get("/api/collection/pending")
def get_pending_collection_items():
    alerts = []

    facebook_posts = fb_fetch_all_posts()
    for index, post in enumerate(facebook_posts):
        status = get_facebook_post_live_status(post)
        if status["new_items"] > 0:
            alerts.append({
                "platform": "facebook",
                "post_id": status["post_id"],
                "post_number": index + 1,
                "new_comments": status["new_comments"],
                "new_replies": status["new_replies"],
                "new_items": status["new_items"],
                "total_items": status["total_items"],
            })

    instagram_posts = ig_fetch_all_media()
    for index, media in enumerate(instagram_posts):
        status = get_instagram_post_live_status(media)
        if status["new_items"] > 0:
            alerts.append({
                "platform": "instagram",
                "post_id": status["post_id"],
                "post_number": index + 1,
                "new_comments": status["new_comments"],
                "new_replies": status["new_replies"],
                "new_items": status["new_items"],
                "total_items": status["total_items"],
            })

    return {
        "alerts": alerts,
        "total_new_items": sum(
            alert["new_items"]
            for alert in alerts
        ),
    }


# Add these endpoints to backend/api.py after the existing collection endpoints.

@app.get(
    "/api/collection/facebook/posts/{post_id}/preview"
)
def preview_facebook_post(post_id: str):
    posts = fb_fetch_all_posts()

    selected_post = next(
        (
            post
            for post in posts
            if str(post.get("id")) == post_id
        ),
        None,
    )

    if selected_post is None:
        raise HTTPException(
            status_code=404,
            detail="Facebook post not found.",
        )

    status = get_facebook_post_live_status(
        selected_post
    )

    return {
        "platform": "facebook",
        "post_id": post_id,
        "text": str(
            selected_post.get("message", "")
        ).strip(),
        "created_time": selected_post.get(
            "created_time"
        ),
        "media_type": "Post",
        "permalink": None,
        "comments": status["comments"],
        "replies": status["replies"],
        "total_items": status["total_items"],
        "new_comments": status["new_comments"],
        "new_replies": status["new_replies"],
        "new_items": status["new_items"],
    }


@app.get(
    "/api/collection/instagram/posts/{media_id}/preview"
)
def preview_instagram_post(media_id: str):
    media_items = ig_fetch_all_media()

    selected_media = next(
        (
            media
            for media in media_items
            if str(media.get("id")) == media_id
        ),
        None,
    )

    if selected_media is None:
        raise HTTPException(
            status_code=404,
            detail="Instagram post not found.",
        )

    status = get_instagram_post_live_status(
        selected_media
    )

    return {
        "platform": "instagram",
        "post_id": media_id,
        "text": str(
            selected_media.get("caption", "")
        ).strip(),
        "timestamp": selected_media.get(
            "timestamp"
        ),
        "media_type": selected_media.get(
            "media_type"
        ),
        "permalink": selected_media.get(
            "permalink"
        ),
        "comments": status["comments"],
        "replies": status["replies"],
        "total_items": status["total_items"],
        "new_comments": status["new_comments"],
        "new_replies": status["new_replies"],
        "new_items": status["new_items"],
    }

@app.get(
    "/api/ai-insights/overview"
)
def get_ai_insights_overview():

    insights = (
        get_overview_topic_insights(
            limit=3
        )
    )

    return {
        "insights": insights
    }

@app.get(
    "/api/ai-insights"
)
def get_all_ai_insights():

    insights = (
        get_overview_topic_insights(
            limit=100
        )
    )

    return {
        "insights": insights
    }