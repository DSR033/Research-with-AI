from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)

app = FastAPI(title="Survey Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ok", "message": "Survey Platform API"}


@app.get("/health")
def health():
    result = supabase.table("surveys").select("id", count="exact").execute()
    return {"status": "healthy", "surveys_count": result.count}


# ─── Surveys ─────────────────────────────────────────────────────

@app.get("/surveys")
def list_surveys():
    result = supabase.table("surveys").select("*").order("created_at", desc=True).execute()
    return result.data


@app.post("/surveys")
def create_survey(payload: dict):
    result = supabase.table("surveys").insert(payload).execute()
    return result.data[0]


@app.get("/surveys/{survey_id}")
def get_survey(survey_id: str):
    result = supabase.table("surveys").select("*, questions(*, question_options(*))").eq("id", survey_id).single().execute()
    return result.data


@app.put("/surveys/{survey_id}")
def update_survey(survey_id: str, payload: dict):
    result = supabase.table("surveys").update(payload).eq("id", survey_id).execute()
    return result.data[0]


@app.delete("/surveys/{survey_id}")
def delete_survey(survey_id: str):
    supabase.table("surveys").delete().eq("id", survey_id).execute()
    return {"deleted": survey_id}


# ─── Questions ───────────────────────────────────────────────────

@app.get("/surveys/{survey_id}/questions")
def list_questions(survey_id: str):
    result = supabase.table("questions").select("*, question_options(*)").eq("survey_id", survey_id).order("position").execute()
    return result.data


@app.post("/surveys/{survey_id}/questions")
def create_question(survey_id: str, payload: dict):
    payload["survey_id"] = survey_id
    result = supabase.table("questions").insert(payload).execute()
    return result.data[0]


# ─── Responses ───────────────────────────────────────────────────

@app.post("/surveys/{survey_id}/responses")
def submit_response(survey_id: str, payload: dict):
    response = supabase.table("responses").insert({
        "survey_id": survey_id,
        "status": payload.get("status", "complete"),
        "metadata": payload.get("metadata", {})
    }).execute()

    response_id = response.data[0]["id"]

    if payload.get("answers"):
        answers = [{"response_id": response_id, "question_id": a["question_id"], "value": a["value"]}
                   for a in payload["answers"]]
        supabase.table("answers").insert(answers).execute()

    return {"response_id": response_id}


@app.get("/surveys/{survey_id}/results")
def get_results(survey_id: str):
    responses = supabase.table("responses").select("id, status, completed_at").eq("survey_id", survey_id).execute()
    answers = supabase.table("answers").select("question_id, value").eq(
        "response_id", f"in.({','.join(r['id'] for r in responses.data)})"
    ).execute() if responses.data else type("R", (), {"data": []})()

    return {
        "total": len(responses.data),
        "complete": sum(1 for r in responses.data if r["status"] == "complete"),
        "partial": sum(1 for r in responses.data if r["status"] == "partial"),
        "answers": answers.data,
    }
