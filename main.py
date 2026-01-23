from fastapi import FastAPI
from google.cloud import bigquery

app = FastAPI()
bq = bigquery.Client()

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/predict")
def predict(payload: dict):
    # payload 예시:
    # {
    #   "date": "2024-01-15",
    #   "sku": "onion",
    #   "yesterday_sales": 22,
    #   "week_avg_sales": 20,
    #   "today_temp": 8,
    #   "yesterday_temp": 9
    # }

    model = "thematic-answer-456611-c0.export_evaluated_data_items_untitled_1769130345070_2026_01_22T17_51_44_030Z.m_sales_lr"

    query = f"""
    SELECT predicted_sales
    FROM ML.PREDICT(
      MODEL `{model}`,
      (
        SELECT
          DATE '{payload["date"]}' AS date,
          '{payload["sku"]}' AS sku,
          {payload["yesterday_sales"]} AS yesterday_sales,
          {payload["week_avg_sales"]} AS week_avg_sales,
          {payload["today_temp"]} AS today_temp,
          {payload["yesterday_temp"]} AS yesterday_temp,
          ({payload["today_temp"]} - {payload["yesterday_temp"]}) AS temp_diff,
          EXTRACT(DAYOFWEEK FROM DATE '{payload["date"]}') AS dow
      )
    )
    """

    rows = list(bq.query(query).result())
    pred = rows[0]["predicted_sales"]

    return {"predicted_sales": float(pred)}

