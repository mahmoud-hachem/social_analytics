import os
from typing import Literal

import pymysql
from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel, Field


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

GEMINI_API_KEY = require_env("GEMINI_API_KEY")
GEMINI_MODEL = require_env("GEMINI_MODEL")

gemini_client = genai.Client(
    api_key=GEMINI_API_KEY
)


LanguageLabel = Literal[
    "english",
    "arabic",
    "arabizi",
    "mixed",
    "unknown",
]

SentimentLabel = Literal[
    "positive",
    "neutral",
    "negative",
]

IntentLabel = Literal[
    "complaint",
    "question",
    "praise",
    "suggestion",
    "information_request",
    "general_opinion",
]

SeverityLabel = Literal[
    "low",
    "medium",
    "high",
]

TopicLabel = Literal[
    "network_coverage",
    "mobile_data_speed",
    "network_outage",
    "billing",
    "balance_deduction",
    "package_activation",
    "package_renewal",
    "customer_service",
    "mobile_application",
    "roaming",
    "pricing",
    "sim_card",
    "router_device",
    "positive_feedback",
    "general_question",
    "other",
]


class AnalysisResult(BaseModel):
    language: LanguageLabel
    sentiment: SentimentLabel
    topic: TopicLabel
    intent: IntentLabel
    severity: SeverityLabel

    confidence: float = Field(
        ge=0.0,
        le=1.0,
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
        autocommit=False,
    )


def get_content_without_analysis() -> list[dict]:
    """
    Read content rows that do not yet have an analysis.
    """
    connection = get_database_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    c.id,
                    c.content_text
                FROM content AS c
                LEFT JOIN content_analysis AS a
                    ON a.content_id = c.id
                WHERE a.content_id IS NULL
                ORDER BY c.id
                """
            )

            return cursor.fetchall()

    finally:
        connection.close()

def analyze_text_with_gemini(
    text: str,
) -> AnalysisResult:
    cleaned_text = text.strip()

    if not cleaned_text:
        raise ValueError(
            "Cannot analyze empty content."
        )

    prompt = f"""
Analyze one telecom-related social-media comment.

Return these six fields:

1. language
2. sentiment
3. topic
4. intent
5. severity
6. confidence

Language labels:

- english: mainly English
- arabic: mainly Arabic script
- arabizi: Arabic or Lebanese written mainly with Latin letters
- mixed: meaningful combination of languages or writing systems
- unknown: unclear, emoji-only, or impossible to identify

Sentiment labels:

- positive
- neutral
- negative

Topic labels:

- network_coverage
- mobile_data_speed
- network_outage
- billing
- balance_deduction
- package_activation
- package_renewal
- customer_service
- mobile_application
- roaming
- pricing
- sim_card
- router_device
- positive_feedback
- general_question
- other

Intent labels:

- complaint
- question
- praise
- suggestion
- information_request
- general_opinion

Severity labels:

- low: general question, praise, opinion, or minor inconvenience
- medium: service issue affecting the customer but not a major outage
- high: outage, repeated service failure, duplicate charging,
  serious billing issue, or inability to use an essential service

Confidence:

Return one value from 0 to 1 representing your overall certainty
about the complete analysis.

Comment:

{cleaned_text}
""".strip()

    response = gemini_client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0,
            response_mime_type="application/json",
            response_schema=AnalysisResult,
        ),
    )

    parsed = response.parsed

    if parsed is None:
        raise RuntimeError(
            "Gemini returned no structured result."
        )

    if isinstance(parsed, AnalysisResult):
        return parsed

    if isinstance(parsed, dict):
        return AnalysisResult.model_validate(
            parsed
        )

    raise RuntimeError(
        f"Unexpected Gemini result type: {type(parsed)}"
    )



def save_analysis(
    content_id: int,
    analysis: AnalysisResult,
) -> None:
    connection = get_database_connection()

    sql = """
        INSERT INTO content_analysis (
            content_id,
            language,
            sentiment,
            topic,
            intent,
            severity,
            confidence
        )
        VALUES (
            %(content_id)s,
            %(language)s,
            %(sentiment)s,
            %(topic)s,
            %(intent)s,
            %(severity)s,
            %(confidence)s
        )
        ON DUPLICATE KEY UPDATE
            language = VALUES(language),
            sentiment = VALUES(sentiment),
            topic = VALUES(topic),
            intent = VALUES(intent),
            severity = VALUES(severity),
            confidence = VALUES(confidence),
            analyzed_at = CURRENT_TIMESTAMP
    """

    values = {
        "content_id": content_id,
        "language": analysis.language,
        "sentiment": analysis.sentiment,
        "topic": analysis.topic,
        "intent": analysis.intent,
        "severity": analysis.severity,
        "confidence": analysis.confidence,
    }

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                sql,
                values,
            )

        connection.commit()

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()



def main() -> None:
    rows = get_content_without_analysis()

    print(
        f"Found {len(rows)} content items "
        "without analysis."
    )

    successful = 0
    failed = 0

    for row in rows:
        content_id = row["id"]
        content_text = row["content_text"]

        try:
            analysis = analyze_text_with_gemini(
                content_text
            )

            save_analysis(
                content_id,
                analysis,
            )

            successful += 1

            print(
                f"Content {content_id}: "
                f"{analysis.language}, "
                f"{analysis.sentiment}, "
                f"{analysis.topic}, "
                f"{analysis.intent}, "
                f"{analysis.severity}, "
                f"{analysis.confidence:.2f}"
            )

        except Exception as exc:
            failed += 1

            print(
                f"Failed content {content_id}: "
                f"{exc}"
            )

    print(
        f"Finished. Successful: {successful}. "
        f"Failed: {failed}."
    )


if __name__ == "__main__":
    main()