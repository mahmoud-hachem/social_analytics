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
    "prepaid_sim",
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

The original post may also provide context for vague comments
such as:

"nice"
"how much?"
"where?"
"does it work?"
"🔥"
"love it"
""".strip()


    if parent_text:
        analysis_context = f"""
{post_context}

This social-media item is a REPLY to another comment.

PARENT COMMENT:
{parent_text}

REPLY TO ANALYZE:
{cleaned_text}


IMPORTANT RULES FOR REPLIES

Analyze the meaning and role of the REPLY itself.

Use the parent comment to understand:
- what the reply refers to
- whether the reply agrees
- whether the reply disagrees
- whether the reply asks a follow-up
- whether the reply provides information
- what topic a vague reply refers to
- what sentiment short agreement language actually expresses

Do NOT automatically copy every label from the parent.

However, when the reply confirms or repeats the same experience,
use the parent's issue as context for topic, sentiment and severity.


EXAMPLE 1

Parent:
"The internet has been down since morning."

Reply:
"You are right."

Correct interpretation:
intent = confirmation
sentiment = negative
topic = network_outage

Do NOT classify "you are right" as positive just because
the phrase sounds linguistically positive.


EXAMPLE 2

Parent:
"The internet is very slow today."

Reply:
"Same here."

Correct interpretation:
intent = confirmation
sentiment = negative
topic = mobile_data_speed


EXAMPLE 3

Parent:
"My balance was deducted twice."

Reply:
"Same thing happened to me."

Correct interpretation:
intent = confirmation
sentiment = negative
topic = balance_deduction
severity = high


EXAMPLE 4

Parent:
"The service is amazing."

Reply:
"Exactly, I love it too."

Correct interpretation:
intent = confirmation
sentiment = positive
severity = low


EXAMPLE 5

Parent:
"The network is terrible."

Reply:
"No, mine is working perfectly."

Correct interpretation:
intent = disagreement
sentiment = positive or neutral
topic = network_coverage
severity = low


EXAMPLE 6

Parent:
"My roaming stopped working."

Reply:
"Did they fix it for you?"

Correct interpretation:
intent = follow_up
topic = roaming
sentiment = neutral


EXAMPLE 7

Parent:
"The internet has been down for hours."

Reply:
"same 😂"

The laughing emoji does NOT automatically make the reply positive.

Correct interpretation:
intent = confirmation
sentiment = negative
topic = network_outage


EXAMPLE 8

Parent:
"Customer service never answers."

Reply:
"😂😂 exactly"

Correct interpretation:
intent = confirmation
sentiment = negative
topic = customer_service


EXAMPLE 9

Parent:
"The internet is down."

Reply:
"Mine is fine 😂"

Correct interpretation:
intent = disagreement
sentiment = positive or neutral
topic = network_outage or network_coverage


EXAMPLE 10

Parent:
"They deducted my balance again."

Reply:
"😭 same"

The crying emoji reinforces frustration.

Correct interpretation:
intent = confirmation
sentiment = negative
topic = balance_deduction
severity = high


The original post provides the overall subject.

The parent comment provides conversational context.

The final labels must describe the actual meaning
and role of the REPLY.
""".strip()

    else:
        analysis_context = f"""
{post_context}

This social-media item is a TOP-LEVEL COMMENT.

COMMENT TO ANALYZE:
{cleaned_text}


Analyze the comment itself.

Use the original post as context when the comment is vague.

Examples:

"nice one"
"how can I get this?"
"how much?"
"does it work?"
"where is it available?"
"🔥"
"love this"

A vague comment may only make sense when combined
with the original post.

However, if the customer clearly talks about a different issue,
classify the customer's actual issue instead of the post subject.
""".strip()


    prompt = f"""
You analyze customer social-media content for a Lebanese
telecommunications company.

Your task is semantic interpretation.

Do NOT classify content using isolated keywords,
individual emojis, or surface wording alone.

First determine what the customer actually means.

The content may contain:

- English
- Arabic script
- Lebanese Arabic dialect
- Arabizi
- mixed English / Arabic / Arabizi
- slang
- abbreviations
- spelling mistakes
- sarcasm
- irony
- mockery
- exaggeration
- emojis
- contradictory emojis
- emotional language
- very short replies
- vague references
- rhetorical questions


Return exactly these fields:

1. language
2. post_topic
3. sentiment
4. topic
5. intent
6. severity
7. confidence


============================================================
GENERAL INTERPRETATION PRIORITY
============================================================

Before assigning labels, understand the content in this order:

1. What does the actual customer text mean?
2. Is the wording literal, sarcastic, ironic, exaggerated or joking?
3. What do emojis mean in this specific context?
4. If this is a reply, what does the parent comment mean?
5. If the text is vague, what does the original post provide?
6. What is the main customer subject?
7. What is the main communicative intent?
8. What real-world severity is being described?

Meaning is more important than individual words.

Context is more important than isolated emojis.


============================================================
LANGUAGE
============================================================

Allowed labels:

english
arabic
arabizi
mixed
unknown


english:

Mainly English.

Examples:

"The internet is very slow."
"How much does this package cost?"
"Great service 😂 another outage."


arabic:

Mainly Arabic written in Arabic script.

This includes Lebanese dialect and Modern Standard Arabic.

Examples:

"الشبكة مقطوعة من الصبح"

"ليش عم تخصموا الرصيد؟"

"خدمة رائعة 😂 صارلنا خمس ساعات بلا نت"


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

Do NOT require perfect Arabizi spelling.

Lebanese Arabizi may be highly inconsistent.

Examples:

"ma fi network men l soboh"

"leh l internet 3am yi2ta3"

"kif baddi fa3el l bundle"

"mabrouk 3layna outage jdide 😂"

"ya zalame ma fi signal"


mixed:

Use mixed when there is a meaningful combination of
different language forms.

Examples:

"internet ktir slow"

"the service كتير سيئة"

"ما في network اليوم"

"great service ya zalame 😂"

"activation ما عم تشتغل"

"customer service wala marra بيرد"


IMPORTANT LANGUAGE RULE:

A small borrowed technical term such as:

internet
network
router
SIM
app
package

does not always automatically make the language mixed.

Determine which language system carries most of the sentence.

Example:

"النت كتير slow اليوم"

This meaningfully combines Arabic/English,
so language = mixed.


unknown:

Use unknown for content where language cannot reasonably
be determined.

Examples:

"😂😂😂"

"😭"

"🔥🔥"

"..."

"???"

Do NOT automatically use unknown when an emoji appears
beside meaningful text.


============================================================
POST TOPIC
============================================================

Determine post_topic only from the ORIGINAL SOCIAL MEDIA POST.

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
prepaid_sim
other


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

prepaid_sim:
The post primarily promotes, announces, or provides information
about a prepaid mobile line or prepaid SIM product.

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


============================================================
EMOJI INTERPRETATION
============================================================

Emojis do NOT have fixed sentiment.

Never classify sentiment from an emoji alone when meaningful
text or conversation context exists.

The same emoji may express:

- happiness
- sadness
- frustration
- laughter
- disbelief
- sarcasm
- mockery
- irony
- excitement
- exaggeration
- relief
- embarrassment
- agreement


Common ambiguous emojis include:

😂
😭
🙃
👏
❤️
🔥
💀
🤣
🙂
😅
🤡
👍


Interpret them from the FULL MESSAGE.


Example:

"😭 finally the internet is working again"

The crying emoji can express relief or emotional excitement.

Likely:
sentiment = positive


Example:

"Amazing service 😂 the internet has been down for 6 hours"

"Amazing service" is sarcastic.

The laughing emoji does not make the message positive.

sentiment = negative
intent = mockery or complaint


Example:

"Love paying twice for the same thing ❤️"

The positive word "love" and heart emoji are sarcastic.

sentiment = negative
topic = balance_deduction or billing
intent = complaint or mockery


Example:

"Another outage 👏👏 great job"

The applause and praise are sarcastic.

sentiment = negative
topic = network_outage
intent = mockery


Example:

"I'm crying 😭 this internet is insanely fast today"

If the customer clearly praises the speed:

sentiment = positive
topic = mobile_data_speed
intent = praise


Example:

"🔥🔥🔥 another $10 disappeared from my balance"

The fire emojis do NOT override the complaint.

sentiment = negative
topic = balance_deduction


Example:

"صح 😂"

If replying to:

"The internet is terrible."

Then:

intent = confirmation
sentiment = negative


Example:

"😂😂😂"

with no meaningful textual context:

language = unknown

Sentiment and intent may be uncertain.

Use context if available and lower confidence.


============================================================
SARCASM, IRONY AND MOCKERY
============================================================

Social-media users often express negative experiences using
positive words sarcastically.

Look for contradictions between positive wording
and negative situations.

Common patterns:

"great service" + service failure

"amazing" + outage

"bravo" + complaint

"thank you" + unresolved problem

"love it" + financial loss

"perfect" + no signal

"ممتاز" + failure

"رائع" + outage

"مبروك" + negative event


Examples:

"Great service 😂 been down all day."

sentiment = negative
intent = mockery
topic = network_outage


"Wow. Amazing. Another outage."

sentiment = negative
intent = mockery
topic = network_outage


"bravo 3laykon 😂 ma fi network"

sentiment = negative
intent = mockery
topic = network_coverage or network_outage


"يعطيكن العافية 👏 كل يوم الشبكة بتقطع"

Do not classify this as praise.

sentiment = negative
intent = complaint or mockery


"مبروك علينا الانقطاع الجديد 🙃"

sentiment = negative
intent = mockery
topic = network_outage


"perfect ya zalame ma fi signal 😂"

sentiment = negative
intent = mockery
topic = network_coverage


"wow very cheap 🙃"

If context indicates the customer believes the price
is actually expensive:

sentiment = negative
topic = pricing
intent = mockery or complaint

If sarcasm cannot confidently be established,
lower confidence.


============================================================
SENTIMENT
============================================================

Allowed labels:

positive
neutral
negative


Judge the intended meaning of the COMPLETE message.

Do not judge sentiment by:

- one adjective
- one emoji
- one polite phrase
- one agreement word
- one sarcastic phrase


positive:

The overall customer meaning expresses satisfaction,
praise, relief, approval or a positive experience.


neutral:

The message is mainly informational, factual,
a normal question, or lacks a clear positive/negative stance.


negative:

The message expresses dissatisfaction, frustration,
failure, criticism, complaint, financial harm,
service problems or negative sarcasm.


IMPORTANT AGREEMENT RULE:

Agreement inherits the sentiment of what is being agreed with
when the reply itself depends on the parent.

Parent:
"The internet is down."

Reply:
"You are right."

sentiment = negative


Parent:
"The service is amazing."

Reply:
"Exactly!"

sentiment = positive


IMPORTANT MIXED-SENTIMENT RULE:

Some comments contain both positive and negative content.

Choose the sentiment that represents the main purpose
or final practical customer message.

Example:

"The offer is great but activation doesn't work."

The actual customer problem is activation failure.

Likely:
sentiment = negative
topic = package_activation


Example:

"Same thing happened to me, but honestly they fixed it fast."

If the main message emphasizes successful resolution,
sentiment may be positive or neutral.

If it mainly emphasizes the original problem,
sentiment may be negative.

Use the complete wording and lower confidence
when the balance is genuinely unclear.


Example:

"شكراً كتير ❤️ بس المشكلة بعدها موجودة"

The gratitude does not erase the unresolved issue.

sentiment = negative


============================================================
RHETORICAL QUESTIONS
============================================================

A sentence ending with a question mark is not always
a genuine information-seeking question.

Distinguish:

REAL QUESTION:
"How much does the package cost?"

intent = question


RHETORICAL COMPLAINT:
"Is it normal that my balance disappears every morning? 🙂"

The customer is reporting a problem, not simply requesting
neutral information.

Likely:
intent = complaint
sentiment = negative
topic = balance_deduction


RHETORICAL MOCKERY:
"Do you guys ever have a day without an outage? 😂"

Likely:
intent = mockery or complaint
sentiment = negative
topic = network_outage


Use question only when the primary purpose is genuinely
to obtain information.


============================================================
TOPIC
============================================================

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


network_coverage:

Weak signal, no signal in an area, poor geographic coverage,
reception problems.

Examples:

"no signal in my area"

"ما في إرسال بالضيعة"

"ma fi signal"


mobile_data_speed:

Slow or unusually fast mobile data,
speed or performance complaints.

Examples:

"internet is extremely slow"

"النت كتير بطيء"

"net kteer slow"


network_outage:

Complete interruption, network down,
service unavailable for a period,
repeated major disconnections.

Examples:

"internet has been down since morning"

"الشبكة مقطوعة"

"ma fi net men l soboh"


billing:

Bills, invoices, charging or general billing issues
that are not specifically balance deductions.


balance_deduction:

Unexpected balance loss, duplicate deduction,
credit disappearing or being deducted incorrectly.

Examples:

"خصمتولي الرصيد مرتين"

"my balance disappeared"

"khasamtole balance"


package_activation:

Activating or failing to activate a package/bundle.


package_renewal:

Renewing or failing to renew an existing package.


customer_service:

Support, call centers, employees, response times,
customer-care experience.


mobile_application:

The telecom mobile app, app login, crashes,
app features or app technical problems.


packages_offers:

Package availability, bundle details,
included data/minutes or package options.


roaming:

Roaming service, roaming activation or roaming problems.


pricing:

Prices, affordability, cost or expensive/cheap discussion.


sim_card:

SIM availability, replacement, SIM problems or prepaid SIM.


router_device:

Routers, hardware devices, compatibility,
setup or device questions.


other:

Use only if no supported topic reasonably fits.


============================================================
QUESTION / TOPIC RULE
============================================================

A question is an INTENT, not a TOPIC.

Even when the customer asks a question,
identify the subject of the question.


"How much does it cost?"

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


If the question is vague, use the original social-media post.


============================================================
CONTEXT-DEPENDENT COMMENTS
============================================================

Very short comments often require the original post.

Example:

Original post:
"Introducing our new 4G router."

Comment:
"nice one"

topic = router_device
intent = praise
sentiment = positive


Original post:
"Introducing our new 4G router."

Comment:
"how much?"

topic = pricing
intent = question


Original post:
"Introducing our new 4G router."

Comment:
"where can I get it?"

topic = router_device
intent = question


Original post:
"Introducing our new bundle."

Comment:
"how do I activate it?"

topic = package_activation
intent = question


But if the customer explicitly discusses another problem,
follow the customer's actual subject.

Original post:
"Introducing our new 4G router."

Comment:
"Your customer service never answers."

topic = customer_service


============================================================
INTENT
============================================================

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


complaint:

The main purpose is reporting dissatisfaction,
a failure, harm or a problem.

Examples:

"Internet has been down for hours."

"They deducted my balance twice."

"Customer service never answers."


question:

The main purpose is genuinely asking for information.

Examples:

"How much does it cost?"

"Where can I buy it?"

"How do I activate the bundle?"

"Is it available in Beirut?"


praise:

The user expresses genuine satisfaction or appreciation.

Examples:

"Great service today!"

"Internet is super fast 🔥"

"خدمتكن ممتازة"


suggestion:

The customer recommends a change or improvement.

Examples:

"You should add a smaller package."

"Please improve coverage in our area."


general_opinion:

An opinion that does not more clearly match another intent.


confirmation:

A reply agrees with or confirms the parent's experience.

Examples:

"same here"

"exactly"

"you are right"

"صح"

"اي والله"

"same problem with me"

"100% true"


disagreement:

A reply rejects or contradicts the parent.

Examples:

"that's not true"

"mine is working fine"

"I disagree"

"لا بالعكس عندي شغالة"


follow_up:

A reply continues the discussion with a contextual question
rather than introducing an independent issue.

Examples:

"did they fix it?"

"how long did it take?"

"what did support tell you?"

"وين صارت معك؟"


informational_response:

A reply provides information, facts, explanation or instructions.

Examples:

"It costs $36."

"You can buy it from the store."

"Yes, it works with a power bank."


mockery:

The user mainly uses sarcasm, ridicule, irony,
mock praise or joking criticism.

Examples:

"bravo 3laykon 😂"

"great service as always 🙄"

"مبروك علينا الانقطاع الجديد"

"amazing, another outage 👏"

"perfect ya zalame ma fi signal 😂"


============================================================
INTENT PRIORITY FOR HARD CASES
============================================================

When several intents seem possible,
choose the primary communicative purpose.

Example:

"Great service 😂 been down for six hours."

The literal words look like praise,
but the actual purpose is ridicule.

intent = mockery


Example:

"Is it normal that you deduct my balance every day?"

Although grammatically a question,
the main purpose is reporting a recurring problem.

intent = complaint


Example:

"The offer is nice but why doesn't activation work?"

The customer is genuinely asking why activation fails.

Depending on wording:

intent = question

or if mainly expressing dissatisfaction:

intent = complaint

Choose the stronger communicative purpose
and lower confidence if genuinely balanced.


============================================================
SEVERITY
============================================================

Choose exactly one:

low
medium
high


low:

- praise
- ordinary questions
- informational replies
- general opinions
- minor inconvenience
- low-impact discussion
- ordinary pricing/package questions


medium:

- service degradation
- slow internet
- support problems
- app failures
- activation problems
- meaningful inconvenience
- recurring but not clearly critical problems


high:

- full network outage
- prolonged inability to use essential service
- repeated major service failure
- duplicate charging
- serious billing harm
- balance loss
- repeated unexpected deductions
- customer explicitly unable to access essential service


IMPORTANT:

Tone does NOT determine severity.

A funny or sarcastic comment can still describe
a high-severity problem.

Example:

"amazing 😂 no internet for 8 hours"

sentiment = negative
intent = mockery
topic = network_outage
severity = high


Example:

"Love losing my balance every morning ❤️"

sentiment = negative
topic = balance_deduction
severity = high


A very angry comment about a minor issue is not automatically high.

Severity measures the real-world seriousness
of the described situation.


============================================================
LEBANESE DIALECT AND ARABIZI
============================================================

Interpret Lebanese expressions semantically,
not literally word-by-word.

Examples:

"الأسعار نار"

This may mean prices are extremely high/expensive.

Likely:
topic = pricing
sentiment = negative

But if context clearly uses "نار" to mean excellent,
interpret accordingly.


"الشبكة نار اليوم 🔥"

This may mean the network is excellent.

Likely:
sentiment = positive

But slang can be ambiguous.
Use surrounding wording and confidence.


"net tayyar"

May describe very fast internet depending on context.

Do not automatically classify it as a problem.


"w l cherkeh ma ma3a khabar hahaha"

This mocks the company for being unaware.

intent = mockery


"ya 3ayb el shoum amazing network 👏"

Positive English words are contradicted by Lebanese criticism.

sentiment = negative
intent = mockery


============================================================
NEGATION
============================================================

Pay close attention to negation.

Examples:

"not bad"

Usually positive or mildly positive,
not negative.


"not working"

negative.


"مش سيئة"

Means "not bad".

Likely positive or neutral.


"ما في مشكلة"

Means "there is no problem."

Likely positive or neutral.


"ما في network"

Means there is no network.

negative.


"mine isn't slow anymore"

May indicate improvement and positive sentiment.


============================================================
EXAGGERATION
============================================================

Social-media wording often exaggerates.

Examples:

"literally dying because this internet is so fast 😂"

Do not treat "dying" as harm if context clearly expresses excitement.


"This internet is killing me"

Could indicate frustration.

Use context.


"عم موت من السرعة"

May express excitement about very fast service,
not literal danger.


============================================================
EMOJI-ONLY CONTENT
============================================================

When the content contains only emojis:

Examples:

"😂😂"

"😭"

"🔥"

"❤️❤️"

language = unknown


Use original post or parent context only when it genuinely
provides enough meaning.

Do NOT confidently invent a topic, intent or sentiment
from an ambiguous emoji alone.

Because the schema requires labels,
choose the most context-supported labels and lower confidence.


Example:

Original post:
"New package available today."

Comment:
"🔥🔥"

Possible interpretation:
positive praise about packages_offers

But confidence should be lower than for explicit text.


Reply to:
"Internet has been down all day."

Reply:
"😭"

This likely expresses negative emotion related to network_outage,
but confidence should remain lower because the reply is emoji-only.


============================================================
MULTIPLE TOPICS
============================================================

The schema requires exactly one primary topic.

If a comment mentions multiple issues,
select the issue that is:

1. the main purpose of the message
2. the strongest complaint/question
3. the most concrete customer problem

Example:

"The package looks good but customer service never answers."

Main complaint:
customer_service

topic = customer_service


Example:

"Internet is slow and your app keeps crashing."

If both are equally emphasized,
choose the more prominent issue in wording
and lower confidence.


============================================================
CONFIDENCE
============================================================

Return a number from 0 to 1.

Confidence represents certainty in the COMPLETE classification.

Use HIGH confidence, approximately 0.85 to 1.0,
when:

- meaning is explicit
- topic is clear
- intent is clear
- sentiment is clear
- context strongly supports interpretation


Use MEDIUM confidence, approximately 0.65 to 0.84,
when:

- slang is involved but understandable
- mixed language is understandable
- sarcasm is likely
- short replies are clear from parent context


Use LOWER confidence, approximately 0.35 to 0.64,
when:

- sarcasm may have multiple interpretations
- the message is extremely short
- emoji meaning is ambiguous
- multiple topics are equally plausible
- Arabizi spelling is highly unclear
- context is insufficient
- mixed sentiment is genuinely balanced


Use VERY LOW confidence only when the classification
is highly uncertain.

Do not give 0.95 confidence merely because a label
had to be selected.

Ambiguity should be reflected in confidence.


============================================================
FINAL CONSISTENCY CHECK
============================================================

Before returning the result, internally verify:

1. Does sentiment reflect the actual meaning rather than
   positive/negative keywords?

2. Did an emoji incorrectly control the sentiment?

3. Could positive wording actually be sarcasm?

4. If this is a reply, did you use the parent context correctly?

5. If the reply says "same", "exactly", "صح", or similar,
   did you determine what it agrees with?

6. If the sentence is a question, is it really asking for
   information or rhetorically complaining?

7. Did you confuse post_topic with customer topic?

8. Did you classify a question's SUBJECT as the topic?

9. Does severity reflect real-world impact rather than emotion?

10. If the content is ambiguous, is confidence appropriately lower?

11. If several topics appear, did you select the primary one?

12. Does the intent represent the user's actual communicative purpose?


============================================================
HARD EXAMPLES
============================================================

Example:

"Amazing service 😂😂 been down for 6 hours"

language = english
sentiment = negative
topic = network_outage
intent = mockery
severity = high


Example:

"I'm literally crying 😭 this internet is sooo fast today"

language = english
sentiment = positive
topic = mobile_data_speed
intent = praise
severity = low


Example:

"Great job guys 🙃 another outage"

sentiment = negative
topic = network_outage
intent = mockery
severity = high


Example:

"Love paying twice for the same thing ❤️"

sentiment = negative
topic = balance_deduction
intent = mockery or complaint
severity = high


Example:

"Is it normal that my balance disappears every morning? 🙂"

sentiment = negative
topic = balance_deduction
intent = complaint
severity = high


Example:

"خدمة رائعة 😂 صارلنا ٥ ساعات بلا نت"

language = arabic
sentiment = negative
topic = network_outage
intent = mockery
severity = high


Example:

"يعطيكن العافية 👏 كل يوم الشبكة بتقطع"

language = arabic
sentiment = negative
topic = network_outage
intent = complaint or mockery


Example:

"كتير حلو ❤️ خصمتولي الرصيد مرتين"

language = arabic
sentiment = negative
topic = balance_deduction
intent = complaint
severity = high


Example:

"mabrouk 3layna outage jdide 🙃"

language = mixed or arabizi depending on dominant structure
sentiment = negative
topic = network_outage
intent = mockery


Example:

"great service 😂 5 se3at ma fi net"

language = mixed
sentiment = negative
topic = network_outage
intent = mockery
severity = high


Example:

"the offer كتير حلو بس activation ما عم تشتغل"

language = mixed
sentiment = negative
topic = package_activation
intent = complaint


Example:

"customer service ولا مرة بيرد 🙃 great support"

language = mixed
sentiment = negative
topic = customer_service
intent = mockery


Example:

"شكراً كتير ❤️ بس المشكلة بعدها موجودة"

language = arabic
sentiment = negative
intent = complaint


Example:

"same thing happened to me but honestly they fixed it fast"

If resolution is the main message:
sentiment = positive or neutral

If the problem remains the dominant meaning:
sentiment = negative

Lower confidence if balanced.


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


    if isinstance(
        parsed,
        AnalysisResult,
    ):
        return parsed


    if isinstance(
        parsed,
        dict,
    ):
        return (
            AnalysisResult
            .model_validate(
                parsed
            )
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
        "content_id":
            content_id,

        "language":
            analysis.language,

        "post_topic":
            analysis.post_topic,

        "sentiment":
            analysis.sentiment,

        "topic":
            analysis.topic,

        "intent":
            analysis.intent,

        "severity":
            analysis.severity,

        "confidence":
            analysis.confidence,
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

        content_text = (
            row["content_text"]
        )

        source_post_text = (
            row["source_post_text"]
            or ""
        )

        parent_text = (
            row["parent_text"]
        )


        try:
            analysis = (
                analyze_text_with_gemini(
                    text=content_text,
                    source_post_text=source_post_text,
                    parent_text=parent_text,
                )
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
                f"Failed content "
                f"{content_id}: "
                f"{exc}"
            )


            # Avoid immediately sending another request
            # after hitting a rate limit.
            time.sleep(13)


    print(
        f"Finished. "
        f"Successful: {successful}. "
        f"Failed: {failed}."
    )


if __name__ == "__main__":
    main()