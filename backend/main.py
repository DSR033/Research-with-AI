import csv
import io
import json
import os
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from supabase import create_client, Client
import anthropic
import stripe

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PRICES = {
    "starter": os.getenv("STRIPE_PRICE_STARTER", ""),
    "pro": os.getenv("STRIPE_PRICE_PRO", ""),
}
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)
ai = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

if STRIPE_SECRET_KEY and not STRIPE_SECRET_KEY.startswith("sk_test_your"):
    stripe.api_key = STRIPE_SECRET_KEY

PLAN_NAMES = {"free": "Free", "starter": "Starter", "pro": "Pro"}

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


# ─── Templates ────────────────────────────────────────────────────────────────

@app.get("/templates")
def list_templates():
    result = supabase.table("templates").select("*").eq("is_public", True).order("category").execute()
    return result.data


@app.post("/templates/{template_id}/use")
def use_template(template_id: str, payload: dict):
    """Create a new survey pre-filled from a template."""
    tmpl = supabase.table("templates").select("*").eq("id", template_id).single().execute().data
    structure = tmpl["structure"]

    survey = supabase.table("surveys").insert({
        "title": structure.get("title", tmpl["name"]),
        "mode": payload.get("mode", "classic"),
        "status": "draft",
    }).execute().data[0]

    for i, q in enumerate(structure.get("questions", [])):
        q_row = supabase.table("questions").insert({
            "survey_id": survey["id"],
            "type": q["type"],
            "title": q["title"],
            "required": q.get("required", False),
            "position": i,
        }).execute().data[0]

        if q.get("options"):
            supabase.table("question_options").insert([
                {"question_id": q_row["id"], "label": opt, "position": j}
                for j, opt in enumerate(q["options"])
            ]).execute()

    return {"survey_id": survey["id"]}


@app.get("/surveys/{survey_id}/results")
def get_results(survey_id: str):
    responses = supabase.table("responses").select("id, status, completed_at").eq("survey_id", survey_id).execute()
    return {
        "total": len(responses.data),
        "complete": sum(1 for r in responses.data if r["status"] == "complete"),
        "partial": sum(1 for r in responses.data if r["status"] == "partial"),
    }


# ─── Export ──────────────────────────────────────────────────────────────────

@app.get("/surveys/{survey_id}/export.csv")
def export_csv(survey_id: str):
    """Download all responses for a survey as a CSV file."""
    # Fetch survey metadata
    survey = supabase.table("surveys").select("title").eq("id", survey_id).single().execute().data
    if not survey:
        raise HTTPException(404, "Survey not found")

    # Fetch questions ordered by position
    questions = supabase.table("questions").select("id, title, type, position").eq("survey_id", survey_id).order("position").execute().data

    # Fetch all responses
    responses = supabase.table("responses").select("id, status, started_at, completed_at").eq("survey_id", survey_id).order("started_at").execute().data

    if not responses:
        # Return empty CSV with headers only
        output = io.StringIO()
        writer = csv.writer(output)
        meta_cols = ["response_id", "status", "started_at", "completed_at"]
        q_cols = [f"Q{i+1}: {q['title'][:60]}" for i, q in enumerate(questions)]
        writer.writerow(meta_cols + q_cols)
        output.seek(0)
        filename = f"{survey['title'][:40].replace(' ', '_')}_responses.csv"
        return StreamingResponse(iter([output.getvalue()]), media_type="text/csv",
                                 headers={"Content-Disposition": f'attachment; filename="{filename}"'})

    # Fetch all answers for these responses in one query
    response_ids = [r["id"] for r in responses]
    answers_raw = supabase.table("answers").select("response_id, question_id, value").in_("response_id", response_ids).execute().data

    # Index answers: {response_id: {question_id: value}}
    answer_index: dict[str, dict[str, str]] = {}
    for a in answers_raw:
        rid = a["response_id"]
        qid = a["question_id"]
        val = a["value"]
        # Flatten value JSON to a readable string
        if isinstance(val, dict):
            if "text" in val:
                display = str(val["text"])
            elif "number" in val:
                display = str(val["number"])
            elif "choice" in val:
                display = str(val["choice"])
            elif "options" in val:
                display = ", ".join(val["options"])
            else:
                display = json.dumps(val)
        else:
            display = str(val)
        answer_index.setdefault(rid, {})[qid] = display

    # Build CSV
    output = io.StringIO()
    writer = csv.writer(output)

    meta_cols = ["response_id", "status", "started_at", "completed_at"]
    q_cols = [f"Q{i+1}: {q['title'][:60]}" for i, q in enumerate(questions)]
    writer.writerow(meta_cols + q_cols)

    for r in responses:
        ans = answer_index.get(r["id"], {})
        row = [
            r["id"],
            r["status"],
            r.get("started_at", "")[:19].replace("T", " ") if r.get("started_at") else "",
            r.get("completed_at", "")[:19].replace("T", " ") if r.get("completed_at") else "",
        ]
        for q in questions:
            row.append(ans.get(q["id"], ""))
        writer.writerow(row)

    output.seek(0)
    filename = f"{survey['title'][:40].replace(' ', '_')}_responses.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ─── Billing ─────────────────────────────────────────────────────────────────

def _stripe_ready():
    return stripe.api_key is not None and bool(stripe.api_key)


@app.get("/billing/plan")
def get_plan(user_id: str):
    """Return the current plan for a user."""
    result = supabase.table("profiles").select("plan, plan_status, plan_period_end, stripe_customer_id").eq("id", user_id).single().execute()
    if not result.data:
        raise HTTPException(404, "Profile not found")
    return result.data


@app.post("/billing/checkout")
def create_checkout(payload: dict):
    """Create a Stripe Checkout session for plan upgrade."""
    if not _stripe_ready():
        raise HTTPException(503, "Stripe is not configured yet. Add STRIPE_SECRET_KEY to backend/.env")

    plan = payload.get("plan")
    user_id = payload.get("user_id")
    user_email = payload.get("email", "")

    if plan not in STRIPE_PRICES or not STRIPE_PRICES[plan]:
        raise HTTPException(400, f"No Stripe Price ID configured for plan '{plan}'")

    # Get or create Stripe customer
    profile = supabase.table("profiles").select("stripe_customer_id").eq("id", user_id).single().execute().data
    customer_id = profile.get("stripe_customer_id") if profile else None

    if not customer_id:
        customer = stripe.Customer.create(email=user_email, metadata={"user_id": user_id})
        customer_id = customer.id
        supabase.table("profiles").update({"stripe_customer_id": customer_id}).eq("id", user_id).execute()

    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": STRIPE_PRICES[plan], "quantity": 1}],
        mode="subscription",
        success_url=f"{FRONTEND_URL}/admin/billing?success=1&plan={plan}",
        cancel_url=f"{FRONTEND_URL}/admin/billing?canceled=1",
        metadata={"user_id": user_id, "plan": plan},
    )
    return {"url": session.url}


@app.post("/billing/portal")
def customer_portal(payload: dict):
    """Create a Stripe Customer Portal session for managing subscription."""
    if not _stripe_ready():
        raise HTTPException(503, "Stripe is not configured yet.")

    user_id = payload.get("user_id")
    profile = supabase.table("profiles").select("stripe_customer_id").eq("id", user_id).single().execute().data
    customer_id = profile.get("stripe_customer_id") if profile else None

    if not customer_id:
        raise HTTPException(400, "No billing account found. Subscribe to a plan first.")

    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=f"{FRONTEND_URL}/admin/billing",
    )
    return {"url": session.url}


@app.post("/billing/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events."""
    if not _stripe_ready():
        raise HTTPException(503, "Stripe not configured.")

    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(400, "Invalid webhook signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session["metadata"].get("user_id")
        plan = session["metadata"].get("plan", "starter")
        if user_id:
            supabase.table("profiles").update({
                "plan": plan,
                "plan_status": "active",
            }).eq("id", user_id).execute()

    elif event["type"] in ("customer.subscription.updated", "customer.subscription.deleted"):
        sub = event["data"]["object"]
        customer_id = sub["customer"]
        profile = supabase.table("profiles").select("id").eq("stripe_customer_id", customer_id).single().execute().data
        if profile:
            status = sub["status"]  # active | past_due | canceled | trialing
            plan = "free" if sub["status"] == "canceled" else None
            update = {"plan_status": status}
            if plan:
                update["plan"] = plan
            if sub.get("current_period_end"):
                from datetime import datetime
                update["plan_period_end"] = datetime.utcfromtimestamp(sub["current_period_end"]).isoformat()
            supabase.table("profiles").update(update).eq("id", profile["id"]).execute()

    elif event["type"] == "invoice.payment_failed":
        invoice = event["data"]["object"]
        customer_id = invoice["customer"]
        profile = supabase.table("profiles").select("id").eq("stripe_customer_id", customer_id).single().execute().data
        if profile:
            supabase.table("profiles").update({"plan_status": "past_due"}).eq("id", profile["id"]).execute()

    return {"received": True}


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
