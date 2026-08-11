import hashlib
import os
from datetime import datetime, timezone
from typing import Any

import pymysql
import requests
from dotenv import load_dotenv

load_dotenv()


def require_env(name: str) -> str:
    value = os.getenv(name)

    if not value:
        raise RuntimeError(
            f"Missing environment variable: {name}"
        )

    return value.strip()


META_PAGE_ACCESS_TOKEN = require_env(
    "META_PAGE_ACCESS_TOKEN"
)
META_PAGE_ID = require_env("META_PAGE_ID")
META_GRAPH_API_VERSION = os.getenv(
    "META_GRAPH_API_VERSION",
    "v26.0",
)

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_NAME = require_env("DB_NAME")
DB_USER = require_env("DB_USER")
DB_PASSWORD = require_env("DB_PASSWORD")

AUTHOR_HASH_SALT = require_env("AUTHOR_HASH_SALT")


def anonymize_author(
    original_author_id: str,
) -> str:
    raw_value = (
        f"{AUTHOR_HASH_SALT}:"
        f"facebook:"
        f"{original_author_id}"
    )

    digest = hashlib.sha256(
        raw_value.encode("utf-8")
    ).hexdigest()

    return f"USER_{digest[:12].upper()}"


def parse_facebook_datetime(
    value: str,
) -> datetime:
    parsed = datetime.strptime(
        value,
        "%Y-%m-%dT%H:%M:%S%z",
    )

    return (
        parsed.astimezone(timezone.utc)
        .replace(tzinfo=None)
    )

def fetch_all_posts() -> list[dict[str, Any]]:
    url: str | None = (
        f"https://graph.facebook.com/"
        f"{META_GRAPH_API_VERSION}/"
        f"{META_PAGE_ID}/posts"
    )

    params: dict[str, Any] | None = {
        "access_token": META_PAGE_ACCESS_TOKEN,
        "fields": "id,message,created_time",
        "limit": 100,
    }

    posts: list[dict[str, Any]] = []

    while url:
        response = requests.get(
            url,
            params=params,
            timeout=30,
        )

        payload = response.json()

        if not response.ok or "error" in payload:
            error = payload.get("error", {})

            raise RuntimeError(
                error.get(
                    "message",
                    "Unknown Meta Graph API error",
                )
            )

        posts.extend(
            payload.get("data", [])
        )

        url = (
            payload.get("paging", {})
            .get("next")
        )

        params = None

    return posts

def fetch_all_comments(
    post_id: str,
) -> list[dict[str, Any]]:
    url: str | None = (
    f"https://graph.facebook.com/"
    f"{META_GRAPH_API_VERSION}/"
    f"{post_id}/comments"
)

    params: dict[str, Any] | None = {
        "access_token": META_PAGE_ACCESS_TOKEN,
        "fields": (
            "id,message,created_time,like_count"
        ),
        "limit": 100,
    }

    comments: list[dict[str, Any]] = []

    while url:
        response = requests.get(
            url,
            params=params,
            timeout=30,
        )

        try:
            payload = response.json()
        except ValueError as exc:
            raise RuntimeError(
                "Meta returned a non-JSON response: "
                f"{response.text}"
            ) from exc

        if not response.ok or "error" in payload:
            error = payload.get("error", {})

            message = error.get(
                "message",
                "Unknown Meta Graph API error",
            )

            error_type = error.get(
                "type",
                "unknown",
            )

            error_code = error.get(
                "code",
                "unknown",
            )

            raise RuntimeError(
                f"Meta API error: {message} "
                f"(type={error_type}, "
                f"code={error_code})"
            )

        comments.extend(
            payload.get("data", [])
        )

        url = (
            payload.get("paging", {})
            .get("next")
        )

        params = None

    return comments

def fetch_comment_replies(
    comment_id: str,
) -> list[dict[str, Any]]:
    url: str | None = (
        f"https://graph.facebook.com/"
        f"{META_GRAPH_API_VERSION}/"
        f"{comment_id}/comments"
    )

    params: dict[str, Any] | None = {
        "access_token": META_PAGE_ACCESS_TOKEN,
        "fields": "id,message,created_time,like_count",
        "limit": 100,
    }

    replies: list[dict[str, Any]] = []

    while url:
        response = requests.get(
            url,
            params=params,
            timeout=30,
        )

        try:
            payload = response.json()
        except ValueError as exc:
            raise RuntimeError(
                "Meta returned a non-JSON response: "
                f"{response.text}"
            ) from exc

        if not response.ok or "error" in payload:
            error = payload.get("error", {})

            raise RuntimeError(
                error.get(
                    "message",
                    "Unknown Meta Graph API error",
                )
            )

        replies.extend(
            payload.get("data", [])
        )

        url = (
            payload.get("paging", {})
            .get("next")
        )

        params = None

    return replies

def normalize_comment(
    comment: dict[str, Any],
    post_id: str,
    post_text: str,
) -> dict[str, Any] | None:
    external_id = str(
        comment.get("id", "")
    ).strip()

    content_text = str(
        comment.get("message", "")
    ).strip()

    created_time = str(
        comment.get("created_time", "")
    ).strip()

    if not external_id:
        print("Skipped comment without an ID.")
        return None

    if not content_text:
        print(
            f"Skipped comment {external_id}: "
            "no text."
        )
        return None

    if not created_time:
        print(
            f"Skipped comment {external_id}: "
            "no creation time."
        )
        return None

    return {
        "external_id": external_id,
        "platform": "facebook",
        "content_type": (
            "comment_under_official_post"
        ),
        "source_post_id": post_id,
        "source_post_text": post_text,
        "parent_external_id": None,
        "author_id": anonymize_author(
            external_id
        ),
        "content_text": content_text,
        "published_at": (
            parse_facebook_datetime(
                created_time
            )
        ),
        "likes_count": int(
            comment.get("like_count") or 0
        ),
    }

def normalize_reply(
    reply: dict[str, Any],
    parent_comment_id: str,
    post_id: str,
    post_text: str,
) -> dict[str, Any] | None:
    external_id = str(
        reply.get("id", "")
    ).strip()

    content_text = str(
        reply.get("message", "")
    ).strip()

    created_time = str(
        reply.get("created_time", "")
    ).strip()

    if not external_id:
        return None

    if not content_text:
        return None

    if not created_time:
        return None

    return {
        "external_id": external_id,
        "platform": "facebook",
        "content_type": "reply_to_comment",
        "source_post_id": post_id,
        "source_post_text": post_text,
        "parent_external_id": parent_comment_id,
        "author_id": anonymize_author(
            external_id
        ),
        "content_text": content_text,
        "published_at": parse_facebook_datetime(
            created_time
        ),
        "likes_count": int(
            reply.get("like_count") or 0
        ),
    }

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


def save_comments(
    comments: list[dict[str, Any]],
) -> None:
    if not comments:
        print("No comments to save.")
        return

    sql = """
        INSERT INTO content (
            external_id,
            platform,
            content_type,
            source_post_id,
            source_post_text,
            parent_external_id,
            author_id,
            content_text,
            published_at,
            likes_count
        )
        VALUES (
            %(external_id)s,
            %(platform)s,
            %(content_type)s,
            %(source_post_id)s,
            %(source_post_text)s,
            %(parent_external_id)s,
            %(author_id)s,
            %(content_text)s,
            %(published_at)s,
            %(likes_count)s
        )
        ON DUPLICATE KEY UPDATE
            content_type = VALUES(content_type),
            source_post_id = VALUES(source_post_id),
            source_post_text = VALUES(source_post_text),
            parent_external_id = VALUES(parent_external_id),
            author_id = VALUES(author_id),
            content_text = VALUES(content_text),
            published_at = VALUES(published_at),
            likes_count = VALUES(likes_count)
    """

    connection = get_database_connection()

    try:
        with connection.cursor() as cursor:
            cursor.executemany(
                sql,
                comments,
            )

        connection.commit()

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


def main() -> None:
    print(
        "Fetching Facebook posts..."
    )

    posts = fetch_all_posts()

    print(
        f"Received {len(posts)} Facebook posts."
    )

    normalized_content: list[
        dict[str, Any]
    ] = []

    for post in posts:
        post_id = str(
            post["id"]
        )

        post_text = str(
            post.get("message", "")
        ).strip()

        print(
            f"\nFetching comments for "
            f"Facebook post {post_id}..."
        )

        print(
            f"Post text: {post_text}"
        )

        raw_comments = fetch_all_comments(
            post_id
        )

        print(
            f"Received {len(raw_comments)} "
            "comments."
        )

        for raw_comment in raw_comments:
            normalized_comment = normalize_comment(
                raw_comment,
                post_id,
                post_text,
            )

            if normalized_comment is not None:
                normalized_content.append(
                    normalized_comment
                )

            comment_id = str(
                raw_comment["id"]
            )

            raw_replies = fetch_comment_replies(
                comment_id
            )

            print(
                f"Comment {comment_id}: "
                f"{len(raw_replies)} replies."
            )

            for raw_reply in raw_replies:
                normalized_reply = normalize_reply(
                    raw_reply,
                    parent_comment_id=comment_id,
                    post_id=post_id,
                    post_text=post_text,
                )

                if normalized_reply is not None:
                    normalized_content.append(
                        normalized_reply
                    )

    save_comments(
        normalized_content
    )

    print(
        "\nFinished."
    )

    print(
        f"Saved {len(normalized_content)} "
        "Facebook comments and replies "
        "to MySQL."
    )


if __name__ == "__main__":
    main()