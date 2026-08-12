import os
import time
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


PostTopicLabel = Literal[
    "new_service",
    "new_feature",
    "new_offer_bundle",
    "service_update",
    "network_upgrade",
    "network_expansion",
    "network_maintenance",
    "new_device",
    "app_digital_feature",
    "roaming_service",
    "esim_service",
    "customer_service_update",
    "pricing_promotion",
    "availability_announcement",
    "how_to_guide",
    "company_announcement",
    "event_campaign",
    "general_information",
    "other",
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
    "general_opinion",
    "confirmation",
    "disagreement",
    "follow_up",
    "informational_response",
    "mockery",
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
    "packages_offers",
    "roaming",
    "pricing",
    "sim_card",
    "router_device",
    "other",
]


class AnalysisResult(BaseModel):
    language: LanguageLabel
    post_topic: PostTopicLabel
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
    Get content rows that do not yet have analysis.

    If the row is a reply, also load the parent comment text.
    """

    connection = get_database_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    c.id,
                    c.platform,
                    c.content_type,
                    c.source_post_id,
                    c.source_post_text,
                    c.content_text,
                    c.parent_external_id,
                    parent.content_text AS parent_text
                FROM content AS c

                LEFT JOIN content_analysis AS a
                    ON a.content_id = c.id

                LEFT JOIN content AS parent
                    ON parent.platform = c.platform
                    AND parent.external_id = c.parent_external_id

                WHERE a.content_id IS NULL

                ORDER BY c.id
                """
            )

            return cursor.fetchall()

    finally:
        connection.close()


def analyze_text_with_gemini(
    text: str,
    source_post_text: str,
    parent_text: str | None = None,
) -> AnalysisResult:

    cleaned_text = text.strip()

    if not cleaned_text:
        raise ValueError(
            "Cannot analyze empty content."
        )

    post_context = f"""
ORIGINAL SOCIAL MEDIA POST:
{source_post_text}

Determine post_topic from the ORIGINAL POST itself.

post_topic describes what the company's Facebook or Instagram
post is mainly about.

Do not determine post_topic from the customer's comment or reply.
""".strip()

    if parent_text:
        analysis_context = f"""
{post_context}

This social-media item is a REPLY to another comment.

PARENT COMMENT:
{parent_text}

REPLY TO ANALYZE:
{cleaned_text}

IMPORTANT RULES FOR REPLIES:

Analyze the REPLY itself.

Use the parent comment only to understand what the reply means.

Do not simply copy every label from the parent.

However, if the reply confirms, agrees with, repeats,
or refers to the same issue as the parent, use the parent's
topic and situation as context.

Examples:

Parent:
"The internet has been down since morning."

Reply:
"You are right."

Correct interpretation:
- the reply confirms the network problem
- intent = confirmation
- sentiment = negative
- topic = network_outage
- severity should reflect the confirmed issue

Do NOT classify "you are right" as positive just because
the wording sounds positive.


Parent:
"The internet is very slow today."

Reply:
"Same here."

Correct interpretation:
- intent = confirmation
- sentiment = negative
- topic = mobile_data_speed


Parent:
"My balance was deducted twice."

Reply:
"Same thing happened to me."

Correct interpretation:
- intent = confirmation
- sentiment = negative
- topic = balance_deduction
- severity may be high because financial harm is involved


Parent:
"The service is amazing."

Reply:
"Exactly, I love it too."

Correct interpretation:
- intent = confirmation
- sentiment = positive
- topic should describe what is being praised
- severity = low


Parent:
"The network is terrible."

Reply:
"No, mine is working perfectly."

Correct interpretation:
- intent = disagreement
- sentiment = positive or neutral depending on wording
- topic = network_coverage or the parent's network topic
- severity = low


Parent:
"My roaming stopped working."

Reply:
"Did they fix it for you?"

Correct interpretation:
- intent = follow_up
- topic = roaming
- sentiment = neutral
- severity should be based on what the reply itself expresses,
  while using the parent for context


The original post provides the overall subject.

The parent comment provides reply context.

The final labels must describe the meaning and role of the REPLY.
""".strip()

    else:
        analysis_context = f"""
{post_context}

This social-media item is a TOP-LEVEL COMMENT.

COMMENT TO ANALYZE:
{cleaned_text}

Analyze this comment itself.

Use the original post as context when the comment is vague,
for example:

"nice one"
"how can I get this?"
"how much?"
"does it work?"

The original post can explain what the customer is referring to.
""".strip()


    prompt = f"""
You analyze customer social-media content for a Lebanese
telecommunications company.

The content may be written in:

- English
- Arabic script
- Lebanese Arabic dialect
- Arabizi
- mixed English / Arabic / Arabizi

Return exactly these fields:

1. language
2. post_topic
3. sentiment
4. topic
5. intent
6. severity
7. confidence


LANGUAGE

Allowed labels:

english:
Mainly English.

arabic:
Mainly Arabic written using Arabic script.
This includes Lebanese dialect and Modern Standard Arabic.

arabizi:
Arabic or Lebanese speech written mainly using Latin letters,
with or without numbers.

Common Arabizi mappings may include:

2 = ء or أ
3 = ع
5 = خ
6 = ط
7 = ح
8 = غ or ق depending on spelling
9 = ص

Examples:

"ma fi network men l soboh"
= arabizi

"leh l internet 3am yi2ta3"
= arabizi

"kif baddi fa3el l bundle"
= arabizi

"الشبكة مقطوعة من الصبح"
= arabic


mixed:
Meaningful combination of English, Arabic script, or Arabizi.

Examples:

"internet ktir slow"
= mixed

"the service كتير سيئة"
= mixed

"ما في network اليوم"
= mixed


unknown:
Emoji-only, punctuation-only, meaningless text,
or content that cannot reasonably be classified.


POST TOPIC

Determine this only from the ORIGINAL SOCIAL MEDIA POST.

Choose exactly one:

new_service
new_feature
new_offer_bundle
service_update
network_upgrade
network_expansion
network_maintenance
new_device
app_digital_feature
roaming_service
esim_service
customer_service_update
pricing_promotion
availability_announcement
how_to_guide
company_announcement
event_campaign
general_information
other


Definitions:

new_service:
The post announces a newly available service.

new_feature:
The post introduces a new capability or feature.

new_offer_bundle:
The post announces or promotes a mobile/data bundle or offer.

service_update:
The post communicates an update or change to an existing service.

network_upgrade:
The post announces improvements or modernization to the network.

network_expansion:
The post announces new coverage areas, sites, antennas,
or network expansion.

network_maintenance:
The post discusses maintenance or technical work on the network.

new_device:
The post introduces or promotes a router, device,
or other hardware product.

app_digital_feature:
The post introduces an app feature, digital tool,
bot, online functionality, or digital service feature.

roaming_service:
The post primarily concerns roaming.

esim_service:
The post primarily concerns eSIM.

customer_service_update:
The post announces something related to customer support
or customer-care channels.

pricing_promotion:
The post primarily promotes a price, discount,
promotion, or special pricing.

availability_announcement:
The post announces that a product or service is now available.

how_to_guide:
The post primarily explains how to perform an action
or use a service.

company_announcement:
The post is primarily a corporate/company announcement.

event_campaign:
The post concerns an event, campaign, sponsorship,
competition, or similar activity.

general_information:
The post provides general information that does not fit
a more specific category.

other:
Use only when no other post topic reasonably applies.


IMPORTANT:

post_topic describes the ORIGINAL POST.

topic describes the CUSTOMER COMMENT OR REPLY.

They may be different.

Example:

Original post:
"Introducing our new 4G router."

post_topic = new_device

Comment:
"Your customer service never answers."

topic = customer_service


SENTIMENT

Allowed labels:

positive
neutral
negative

Judge the intended meaning.

Do not classify agreement phrases such as:

"you are right"

as positive automatically.

For replies, sentiment must reflect what the reply is agreeing
with or disagreeing with.

Example:

Parent:
"The internet is down."

Reply:
"You are right."

sentiment = negative


TOPIC

Choose exactly one primary topic:

network_coverage
mobile_data_speed
network_outage
billing
balance_deduction
package_activation
package_renewal
customer_service
mobile_application
packages_offers
roaming
pricing
sim_card
router_device
other

IMPORTANT QUESTION/TOPIC RULE:

A question is an INTENT, not a TOPIC.

Never use a generic question category as the topic.

Even when the customer asks a question, determine the actual
subject of that question.

Examples:

"How much does it cost?"
If asking about price:
topic = pricing
intent = question

"Where can I buy the SIM?"
topic = sim_card
intent = question

"How do I activate this bundle?"
topic = package_activation
intent = question

"Does this router work with a power bank?"
topic = router_device
intent = question

"Is this package available?"
topic = packages_offers
intent = question

If the question is vague, use the ORIGINAL SOCIAL MEDIA POST
to determine what the user is asking about.

Use topic = other only when the actual subject cannot reasonably
be determined from the comment, reply, original post, or parent context.

Topic examples:

"ما في إرسال بمنطقتنا"
= network_coverage

"النت كتير بطيء"
= mobile_data_speed

"الشبكة مقطوعة من الصبح"
= network_outage

"خصمتولي الرصيد مرتين"
= balance_deduction

"kif baddi fa3el l bundle"
= package_activation

"Why is there no 600 GB bundle?"
= packages_offers

"leh l package ghali"
= pricing

"l app 3am tsakkir"
= mobile_application

"خدمة الزبائن ساعدتني بسرعة"
= customer_service


IMPORTANT TOPIC RULE:

If the customer text is vague and depends on the original post,
use the post context to determine what the customer is referring to.

Example:

Original post:
"Introducing the new 4G router."

Comment:
"nice one"

topic = router_device

Original post:
"Introducing the new 4G router."

Comment:
"how can I get this product?"

topic = router_device

However, if the customer clearly talks about a different issue,
classify the customer's actual issue.

Example:

Original post:
"Introducing the new 4G router."

Comment:
"Your customer service never answers."

topic = customer_service


For replies:

If the reply depends on the parent's subject,
use the parent topic as contextual evidence.

Example:

Parent:
"Internet is extremely slow."

Reply:
"same here"

topic = mobile_data_speed


INTENT

Choose exactly one:

complaint

question

praise

suggestion

general_opinion

confirmation

disagreement

follow_up

informational_response

mockery


Definitions:

complaint:
The user reports dissatisfaction or a problem.

question:
The user asks for information, instructions, availability,
pricing, eligibility, locations, product details,
technical details, compatibility, activation steps,
or any other answer.

Examples:

"How much does it cost?"
"Where can I buy it?"
"How do I activate the bundle?"
"Is this available in Beirut?"
"Does this work with my router?"
"How fast is the connection?"

praise:
The user expresses satisfaction or appreciation.

suggestion:
The user recommends a change or improvement.


general_opinion:
The user expresses an opinion that does not clearly fit
another intent.

confirmation:
The reply agrees with, confirms, or reports the same
experience described in the parent comment.

Examples:

"same here"
"you are right"
"exactly"
"same problem with me"
"100% true"

disagreement:
The reply rejects or contradicts the parent comment.

Examples:

"that's not true"
"mine is working fine"
"I disagree"

follow_up:
The reply continues the conversation and depends on the parent.

Examples:

"did they fix it?"
"how long did it take?"
"what did support tell you?"

informational_response:
The reply provides an answer, fact, explanation, instruction,
or other information in response to the parent comment.

Examples:

"It costs $36."
"The $95 plan has more data."
"You can buy it from the store."
"Yes, it works with a power bank."

mockery:
The user mocks, ridicules, or sarcastically makes fun of the company,
service, product, or situation rather than making a straightforward
complaint.

Examples:

"w l cherkeh ma ma3a khabar hahahaha"
"bravo 3laykon 😂"
"great service as always 🙄"


SEVERITY

Choose exactly one:

low:
Praise, ordinary questions, general opinions,
small inconvenience, or low-impact discussion.

medium:
Service problem affecting the customer but without evidence
of major outage, serious financial impact, or prolonged
loss of essential service.

high:
Network outage, repeated or prolonged service failure,
duplicate charging, serious billing issue,
balance loss, or inability to use an essential service.


For replies:

Use the parent issue as context when the reply confirms
the same problem.

Example:

Parent:
"My balance was deducted twice."

Reply:
"Same here."

The reply confirms a serious financial problem,
so severity should not automatically be low just because
the reply is short.


CONFIDENCE

Return a number from 0 to 1 representing overall confidence
in the complete analysis.

Use lower confidence when:

- the text is extremely short
- the meaning depends heavily on context
- the wording is ambiguous
- Arabizi spelling is unclear
- sarcasm is uncertain
- multiple topics are equally plausible


CONTENT TO ANALYZE

{analysis_context}
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
            post_topic,
            sentiment,
            topic,
            intent,
            severity,
            confidence
        )
        VALUES (
            %(content_id)s,
            %(language)s,
            %(post_topic)s,
            %(sentiment)s,
            %(topic)s,
            %(intent)s,
            %(severity)s,
            %(confidence)s
        )
        ON DUPLICATE KEY UPDATE
            language = VALUES(language),
            post_topic = VALUES(post_topic),
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
        "post_topic": analysis.post_topic,
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
        source_post_text = (
            row["source_post_text"] or ""
        )
        parent_text = row["parent_text"]

        try:
            analysis = analyze_text_with_gemini(
                text=content_text,
                source_post_text=source_post_text,
                parent_text=parent_text,
            )

            save_analysis(
                content_id,
                analysis,
            )

            successful += 1

            if parent_text:
                item_type = "REPLY"
            else:
                item_type = "COMMENT"

            print(
                f"{item_type} {content_id}: "
                f"{analysis.language}, "
                f"post={analysis.post_topic}, "
                f"{analysis.sentiment}, "
                f"{analysis.topic}, "
                f"{analysis.intent}, "
                f"{analysis.severity}, "
                f"{analysis.confidence:.2f}"
            )

            # Free-tier quota is 5 requests/minute.
            # 13 seconds between requests keeps us safely below it.
            time.sleep(13)

        except Exception as exc:

            failed += 1

            print(
                f"Failed content {content_id}: "
                f"{exc}"
            )

            # Avoid immediately sending another request
            # after hitting a rate limit.
            time.sleep(13)

    print(
        f"Finished. Successful: {successful}. "
        f"Failed: {failed}."
    )


if __name__ == "__main__":
    main()