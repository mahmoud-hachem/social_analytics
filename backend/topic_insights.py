import json

from pydantic import BaseModel
from google.genai import types

from content_analyzer import (
    GEMINI_MODEL,
    gemini_client,
    get_database_connection,
)


class GeminiTopicInsight(BaseModel):
    topic: str
    title: str
    insight: str


class GeminiTopicInsightBatch(BaseModel):
    insights: list[GeminiTopicInsight]


def get_topics_for_post(
    platform: str,
    source_post_id: str,
) -> list[str]:

    connection = get_database_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT DISTINCT
                    a.topic

                FROM content AS c

                JOIN content_analysis AS a
                    ON a.content_id = c.id

                WHERE
                    c.platform = %s
                    AND c.source_post_id = %s
                    AND a.topic IS NOT NULL

                ORDER BY a.topic
                """,
                (
                    platform,
                    source_post_id,
                ),
            )

            rows = cursor.fetchall()

    finally:
        connection.close()

    return [
        str(row["topic"])
        for row in rows
        if row["topic"]
    ]


def get_all_topics() -> list[str]:

    connection = get_database_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT DISTINCT
                    topic

                FROM content_analysis

                WHERE topic IS NOT NULL

                ORDER BY topic
                """
            )

            rows = cursor.fetchall()

    finally:
        connection.close()

    return [
        str(row["topic"])
        for row in rows
        if row["topic"]
    ]


def get_topic_context(
    topic: str,
) -> dict:

    connection = get_database_connection()

    try:
        with connection.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    COUNT(*) AS total_items,

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
                    ) AS complaint_count,

                    SUM(
                        CASE
                            WHEN a.severity = 'high'
                            THEN 1
                            ELSE 0
                        END
                    ) AS high_severity_count

                FROM content AS c

                JOIN content_analysis AS a
                    ON a.content_id = c.id

                WHERE a.topic = %s
                """,
                (topic,),
            )

            stats = cursor.fetchone()


            cursor.execute(
                """
                SELECT
                    c.platform,
                    c.content_type,
                    c.content_text,
                    c.source_post_text,
                    c.published_at,

                    a.sentiment,
                    a.intent,
                    a.severity,
                    a.confidence

                FROM content AS c

                JOIN content_analysis AS a
                    ON a.content_id = c.id

                WHERE a.topic = %s

                ORDER BY
                    c.published_at DESC,
                    c.id DESC

                LIMIT 12
                """,
                (topic,),
            )

            examples = cursor.fetchall()

    finally:
        connection.close()


    return {
        "topic": topic,

        "total_items": int(
            stats["total_items"]
            or 0
        ),

        "negative_count": int(
            stats["negative_count"]
            or 0
        ),

        "complaint_count": int(
            stats["complaint_count"]
            or 0
        ),

        "high_severity_count": int(
            stats["high_severity_count"]
            or 0
        ),

        "examples": [
            {
                "platform":
                    row["platform"],

                "content_type":
                    row["content_type"],

                "text":
                    row["content_text"],

                "post_context":
                    row["source_post_text"],

                "sentiment":
                    row["sentiment"],

                "intent":
                    row["intent"],

                "severity":
                    row["severity"],

                "confidence":
                    float(
                        row["confidence"]
                        or 0
                    ),
            }
            for row in examples
        ],
    }


def generate_topic_insights(
    topics: list[str],
) -> list[dict]:

    if not topics:
        return []


    contexts = [
        get_topic_context(topic)
        for topic in topics
    ]


    prompt_data = json.dumps(
        contexts,
        ensure_ascii=False,
        indent=2,
        default=str,
    )


    prompt = f"""
You are generating AI insights for a social-media
customer analytics platform used by a Lebanese
telecommunications company.

The individual comments and replies have already
been analyzed by another AI step.

You are now looking at groups of analyzed content
organized by topic.

Your job is to identify the main customer pattern
inside EACH topic and write a concise insight.

For every topic provided, return:

1. topic
2. title
3. insight


TITLE RULES

The title should be a clean human-readable version
of the topic.

Examples:

network_outage
-> Network Outage

customer_service
-> Customer Service

mobile_data_speed
-> Mobile Data Speed

packages_offers
-> Packages & Offers


INSIGHT RULES

The insight should:

- be 1 to 3 short sentences
- summarize what customers are actually discussing
- mention meaningful patterns
- use complaint, sentiment and severity information
  when it helps explain the topic
- use the representative comments as evidence
- describe repeated concerns when several comments
  express the same issue
- mention positive or neutral patterns when relevant
- distinguish questions from complaints
- avoid simply listing percentages
- avoid generic advice
- avoid inventing information not present in the data
- avoid saying "according to the data"
- avoid saying "AI detected"
- write naturally for a business dashboard

The insight should explain what the topic MEANS
for the current social-media conversation.

Example:

Topic:
network_outage

Possible good insight:

"Customers are reporting repeated and prolonged
service interruptions. Most discussion is negative,
with several users confirming that the same outage
is affecting them."

Another example:

Topic:
packages_offers

Possible good insight:

"Discussion is mainly driven by questions about
package availability, pricing and activation.
Sentiment is mostly neutral because customers are
seeking information rather than reporting problems."


IMPORTANT

Return one result for every supplied topic.

Do not create topics that were not supplied.

Use the exact machine-readable topic value in
the "topic" field.


TOPIC DATA:

{prompt_data}
""".strip()


    response = gemini_client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.2,
            response_mime_type="application/json",
            response_schema=GeminiTopicInsightBatch,
        ),
    )


    parsed = response.parsed

    if parsed is None:
        raise RuntimeError(
            "Gemini returned no topic insights."
        )


    if isinstance(
        parsed,
        GeminiTopicInsightBatch,
    ):
        items = parsed.insights

    elif isinstance(parsed, dict):
        validated = (
            GeminiTopicInsightBatch
            .model_validate(parsed)
        )

        items = validated.insights

    else:
        raise RuntimeError(
            "Unexpected Gemini insight result: "
            f"{type(parsed)}"
        )


    context_map = {
        context["topic"]:
            context
        for context in contexts
    }


    results = []


    for item in items:

        context = context_map.get(
            item.topic
        )

        if context is None:
            continue


        results.append(
            {
                "topic":
                    item.topic,

                "title":
                    item.title.strip(),

                "insight":
                    item.insight.strip(),

                "total_items":
                    context[
                        "total_items"
                    ],

                "negative_count":
                    context[
                        "negative_count"
                    ],

                "complaint_count":
                    context[
                        "complaint_count"
                    ],

                "high_severity_count":
                    context[
                        "high_severity_count"
                    ],
            }
        )


    return results


def save_topic_insights(
    insights: list[dict],
) -> None:

    if not insights:
        return


    connection = get_database_connection()


    sql = """
        INSERT INTO topic_insights (
            topic,
            title,
            insight_text,
            total_items,
            negative_count,
            complaint_count,
            high_severity_count
        )
        VALUES (
            %(topic)s,
            %(title)s,
            %(insight)s,
            %(total_items)s,
            %(negative_count)s,
            %(complaint_count)s,
            %(high_severity_count)s
        )

        ON DUPLICATE KEY UPDATE
            title =
                VALUES(title),

            insight_text =
                VALUES(insight_text),

            total_items =
                VALUES(total_items),

            negative_count =
                VALUES(negative_count),

            complaint_count =
                VALUES(complaint_count),

            high_severity_count =
                VALUES(high_severity_count),

            generated_at =
                CURRENT_TIMESTAMP
    """


    try:
        with connection.cursor() as cursor:
            cursor.executemany(
                sql,
                insights,
            )

        connection.commit()

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


def refresh_topic_insights(
    topics: list[str],
) -> list[dict]:

    unique_topics = list(
        dict.fromkeys(
            topic
            for topic in topics
            if topic
        )
    )


    if not unique_topics:
        return []


    print(
        "Generating Gemini insights for: "
        + ", ".join(unique_topics)
    )


    insights = generate_topic_insights(
        unique_topics
    )


    save_topic_insights(
        insights
    )


    print(
        f"Saved {len(insights)} "
        "topic insights."
    )


    return insights


def refresh_topic_insights_for_post(
    platform: str,
    source_post_id: str,
) -> list[dict]:

    topics = get_topics_for_post(
        platform,
        source_post_id,
    )


    return refresh_topic_insights(
        topics
    )


def refresh_all_topic_insights() -> list[dict]:

    topics = get_all_topics()

    return refresh_topic_insights(
        topics
    )


def get_overview_topic_insights(
    limit: int = 3,
) -> list[dict]:

    connection = get_database_connection()

    try:
        with connection.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    topic,
                    title,
                    insight_text,
                    total_items,
                    negative_count,
                    complaint_count,
                    high_severity_count,
                    generated_at

                FROM topic_insights

                ORDER BY
                    high_severity_count DESC,
                    complaint_count DESC,
                    negative_count DESC,
                    total_items DESC,
                    generated_at DESC

                LIMIT %s
                """,
                (limit,),
            )

            rows = cursor.fetchall()

    finally:
        connection.close()


    return [
        {
            "topic":
                row["topic"],

            "title":
                row["title"],

            "insight":
                row["insight_text"],

            "total_items":
                int(
                    row["total_items"]
                    or 0
                ),

            "negative_count":
                int(
                    row["negative_count"]
                    or 0
                ),

            "complaint_count":
                int(
                    row["complaint_count"]
                    or 0
                ),

            "high_severity_count":
                int(
                    row[
                        "high_severity_count"
                    ]
                    or 0
                ),

            "generated_at": (
                row[
                    "generated_at"
                ].isoformat()
                if row[
                    "generated_at"
                ]
                else None
            ),
        }
        for row in rows
    ]


def main() -> None:

    insights = (
        refresh_all_topic_insights()
    )

    print(
        f"Finished. Generated "
        f"{len(insights)} insights."
    )


if __name__ == "__main__":
    main()