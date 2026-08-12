import os

import pymysql
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import HTMLResponse


load_dotenv()

app = FastAPI()


DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")


def get_connection():
    return pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
    )


@app.get("/", response_class=HTMLResponse)
def review_page():
    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    c.id,
                    c.platform,
                    c.content_type,
                    c.content_text,
                    c.parent_external_id,

                    a.language,
                    a.sentiment,
                    a.topic,
                    a.intent,
                    a.severity,
                    a.confidence

                FROM content AS c

                LEFT JOIN content_analysis AS a
                    ON a.content_id = c.id

                ORDER BY c.id
                """
            )

            rows = cursor.fetchall()

    finally:
        connection.close()

    cards = ""

    for row in rows:
        cards += f"""
        <div class="card">

            <div class="content">
                <h3>
                    ID {row["id"]} —
                    {row["platform"]}
                </h3>

                <div class="type">
                    {row["content_type"]}
                </div>

                <p class="text">
                    {row["content_text"]}
                </p>

                <div class="parent">
                    Parent:
                    {row["parent_external_id"] or "-"}
                </div>
            </div>

            <div class="analysis">
                <h3>Analysis</h3>

                <p>
                    <strong>Language:</strong>
                    {row["language"] or "-"}
                </p>

                <p>
                    <strong>Sentiment:</strong>
                    {row["sentiment"] or "-"}
                </p>

                <p>
                    <strong>Topic:</strong>
                    {row["topic"] or "-"}
                </p>

                <p>
                    <strong>Intent:</strong>
                    {row["intent"] or "-"}
                </p>

                <p>
                    <strong>Severity:</strong>
                    {row["severity"] or "-"}
                </p>

                <p>
                    <strong>Confidence:</strong>
                    {row["confidence"] or "-"}
                </p>
            </div>

        </div>
        """

    html = f"""
    <!DOCTYPE html>
    <html>

    <head>
        <title>Content Review</title>

        <style>

            body {{
                font-family: Arial, sans-serif;
                background: #f4f5f7;
                margin: 0;
                padding: 30px;
            }}

            h1 {{
                margin-bottom: 30px;
            }}

            .card {{
                display: grid;
                grid-template-columns: 1.4fr 1fr;
                gap: 25px;

                background: white;

                padding: 22px;
                margin-bottom: 18px;

                border-radius: 12px;

                box-shadow:
                    0 2px 8px rgba(0, 0, 0, 0.08);
            }}

            .content {{
                border-right: 1px solid #ddd;
                padding-right: 25px;
            }}

            .analysis {{
                padding-left: 5px;
            }}

            .text {{
                font-size: 18px;
                line-height: 1.5;
                white-space: pre-wrap;
            }}

            .type {{
                font-size: 13px;
                color: #666;
                margin-bottom: 15px;
            }}

            .parent {{
                margin-top: 20px;
                font-size: 13px;
                color: #777;
            }}

            .analysis p {{
                margin: 10px 0;
            }}

        </style>

    </head>

    <body>

        <h1>
            Social Media Content Review
        </h1>

        {cards}

    </body>

    </html>
    """

    return HTMLResponse(
        content=html
    )