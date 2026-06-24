import json
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from supabase import create_client, Client
import anthropic

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)
ai = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

app = FastAPI(title="Survey Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Health ──────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok", "message": "Survey Platform API"}


@app.get("/health")
def health():
    result = supabase.table("surveys").select("id", count="exact").execute()
    return {"status": "healthy", "surveys_count": result.count}


# ─── Surveys ─────────────────────────────────────────────────────────────────

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


# ─── Questions ───────────────────────────────────────────────────────────────

@app.get("/surveys/{survey_id}/questions")
def list_questions(survey_id: str):
    result = supabase.table("questions").select("*, question_options(*)").eq("survey_id", survey_id).order("position").execute()
    return result.data


@app.post("/surveys/{survey_id}/questions")
def create_question(survey_id: str, payload: dict):
    payload["survey_id"] = survey_id
    result = supabase.table("questions").insert(payload).execute()
    return result.data[0]


# ─── Responses ───────────────────────────────────────────────────────────────

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
    return {
        "total": len(responses.data),
        "complete": sum(1 for r in responses.data if r["status"] == "complete"),
        "partial": sum(1 for r in responses.data if r["status"] == "partial"),
    }


# ─── AI: Prompt-to-Survey ────────────────────────────────────────────────────

@app.post("/surveys/{survey_id}/generate")
def generate_survey(survey_id: str, payload: dict):
    prompt = payload.get("prompt", "").strip()
    if not prompt:
        raise HTTPException(400, "prompt is required")

    response = ai.messages.create(
        model="claude-opus-4-8",
        max_tokens=4096,
        system="""You are an expert survey designer. Given a description, generate a complete survey.

Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "title": "Survey title",
  "questions": [
    {
      "type": "single_choice",
      "title": "Question text",
      "required": false,
      "options": ["Option A", "Option B", "Option C"]
    }
  ]
}

Allowed types: single_choice, multi_select, short_text, long_text, rating, nps, yes_no, ranking, date_time, likert_matrix.
Only include "options" for: single_choice, multi_select, ranking, likert_matrix.
Generate 4-8 questions. Make them specific, unbiased, and directly relevant to the goal.""",
        messages=[{"role": "user", "content": f"Create a survey for this goal: {prompt}"}],
    )

    text = next(b.text for b in response.content if b.type == "text")
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        raise HTTPException(500, "AI returned invalid JSON")

    # Update survey title
    supabase.table("surveys").update({"title": data["title"]}).eq("id", survey_id).execute()

    # Delete existing questions (replace draft)
    supabase.table("questions").delete().eq("survey_id", survey_id).execute()

    # Create new questions + options
    created = []
    for i, q in enumerate(data.get("questions", [])):
        q_row = supabase.table("questions").insert({
            "survey_id": survey_id,
            "type": q.get("type", "short_text"),
            "title": q.get("title", "Untitled"),
            "required": q.get("required", False),
            "position": i,
        }).execute().data[0]

        if q.get("options"):
            supabase.table("question_options").insert([
                {"question_id": q_row["id"], "label": opt, "position": j}
                for j, opt in enumerate(q["options"])
            ]).execute()

        created.append(q_row)

    return {"title": data["title"], "questions": created}


# ─── AI: Expert Review ───────────────────────────────────────────────────────

@app.post("/surveys/{survey_id}/expert-review")
def expert_review(survey_id: str):
    # Fetch survey + questions
    survey = supabase.table("surveys").select("title").eq("id", survey_id).single().execute().data
    questions = supabase.table("questions").select("title, type, required").eq("survey_id", survey_id).order("position").execute().data

    if not questions:
        return {"findings": [{"severity": "warning", "text": "No questions to review yet."}]}

    q_list = "\n".join(f"{i+1}. [{q['type']}] {q['title']}" for i, q in enumerate(questions))

    response = ai.messages.create(
        model="claude-opus-4-8",
        max_tokens=2048,
        system="""You are a survey methodology expert. Review surveys for:
- Leading or biased questions
- Clarity and specificity
- Appropriate question types
- Survey length and flow
- Missing essential questions

Return ONLY valid JSON (no markdown) with this structure:
{
  "findings": [
    {"severity": "warning|suggestion|pass", "text": "Finding description"}
  ],
  "overall_score": 1-10,
  "summary": "One sentence overall assessment"
}

Be specific and actionable. 3-6 findings is ideal.""",
        messages=[{
            "role": "user",
            "content": f"Survey: \"{survey['title']}\"\n\nQuestions:\n{q_list}"
        }],
    )

    text = next(b.text for b in response.content if b.type == "text")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"findings": [{"severity": "warning", "text": text}], "overall_score": 0, "summary": ""}


# ─── AI: Ask Your Data ───────────────────────────────────────────────────────

@app.post("/surveys/{survey_id}/ask")
def ask_data(survey_id: str, payload: dict):
    question = payload.get("question", "").strip()
    if not question:
        raise HTTPException(400, "question is required")

    # Gather survey data for context
    survey = supabase.table("surveys").select("title").eq("id", survey_id).single().execute().data
    results = supabase.table("responses").select("id, status").eq("survey_id", survey_id).execute()
    total = len(results.data)
    complete = sum(1 for r in results.data if r["status"] == "complete")
    questions = supabase.table("questions").select("title, type").eq("survey_id", survey_id).order("position").execute().data

    context = f"""Survey: "{survey['title']}"
Total responses: {total} ({complete} complete, {total - complete} partial)
Questions: {", ".join(f'"{q["title"]}"' for q in questions[:10])}"""

    response = ai.messages.create(
        model="claude-opus-4-8",
        max_tokens=1024,
        system="""You are a data analyst interpreting survey results. Answer questions about the survey data concisely and accurately.
If you don't have enough data to answer confidently, say so and explain what data would be needed.
Keep answers under 150 words. Be direct and actionable.""",
        messages=[{
            "role": "user",
            "content": f"Survey context:\n{context}\n\nQuestion: {question}"
        }],
    )

    text = next(b.text for b in response.content if b.type == "text")
    return {"answer": text}


# ─── AI: Conversational Follow-up ────────────────────────────────────────────

@app.post("/surveys/{survey_id}/followup")
def generate_followup(survey_id: str, payload: dict):
    question = payload.get("question", "")
    answer = payload.get("answer", "").strip()
    if not answer:
        raise HTTPException(400, "answer is required")

    response = ai.messages.create(
        model="claude-opus-4-8",
        max_tokens=256,
        system="""You are an intelligent survey assistant. Generate a single natural follow-up question based on the respondent's answer.
The follow-up should dig deeper into their reasoning, clarify their position, or explore a specific aspect they mentioned.
Keep it conversational and concise (under 25 words). Return only the question, no preamble.""",
        messages=[{
            "role": "user",
            "content": f"Survey question: \"{question}\"\nRespondent answered: \"{answer}\"\n\nGenerate one follow-up question:"
        }],
    )

    text = next(b.text for b in response.content if b.type == "text").strip()
    return {"followup": text}
