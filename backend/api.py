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


@app.get("/")
def root():
    return {
        "message": "TouchBoard API is running"
    }


@app.get("/api/summary")
def get_summary():
    connection = get_database_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    COUNT(c.id) AS total_content,

                    COUNT(a.content_id) AS analyzed_content,

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

                LEFT JOIN content_analysis AS a
                    ON a.content_id = c.id
                """
            )

            row = cursor.fetchone()

    finally:
        connection.close()


    total_content = int(
        row["total_content"] or 0
    )

    analyzed_content = int(
        row["analyzed_content"] or 0
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


    if analyzed_content > 0:
        negative_percentage = round(
            (
                negative_count
                / analyzed_content
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