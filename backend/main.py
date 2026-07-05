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


@app.put("/surveys/{survey_id}/questions/{question_id}")
def update_question(survey_id: str, question_id: str, payload: dict):
    result = supabase.table("questions").update(payload).eq("id", question_id).eq("survey_id", survey_id).execute()
    return result.data[0]


@app.delete("/surveys/{survey_id}/questions/{question_id}")
def delete_question(survey_id: str, question_id: str):
    supabase.table("question_options").delete().eq("question_id", question_id).execute()
    supabase.table("questions").delete().eq("id", question_id).eq("survey_id", survey_id).execute()
    return {"deleted": question_id}


@app.post("/surveys/{survey_id}/questions/{question_id}/options")
def set_question_options(survey_id: str, question_id: str, payload: dict):
    """Replace all options for a question."""
    options = payload.get("options", [])
    supabase.table("question_options").delete().eq("question_id", question_id).execute()
    if options:
        supabase.table("question_options").insert([
            {"question_id": question_id, "label": opt, "position": i}
            for i, opt in enumerate(options)
        ]).execute()
    return {"updated": question_id, "options": options}


# ─── Responses ───────────────────────────────────────────────────────────────

@app.post("/surveys/{survey_id}/responses")
def submit_response(survey_id: str, payload: dict):
    from datetime import datetime, timezone

    # ── Fetch survey for config enforcement ──
    survey = supabase.table("surveys").select(
        "status, close_date, response_limit, settings"
    ).eq("id", survey_id).single().execute().data

    if not survey:
        raise HTTPException(404, "Survey not found")
    if survey["status"] != "active":
        raise HTTPException(403, "This survey is not currently accepting responses.")

    # Close date
    if survey.get("close_date"):
        close = datetime.fromisoformat(survey["close_date"].replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > close:
            raise HTTPException(403, "This survey has closed.")

    # Response limit
    if survey.get("response_limit"):
        count = supabase.table("responses").select("id", count="exact").eq(
            "survey_id", survey_id
        ).in_("status", ["complete", "partial"]).execute().count or 0
        if count >= survey["response_limit"]:
            raise HTTPException(403, "This survey has reached its response limit.")

    # Prevent duplicate submissions (keyed by respondent_id if provided)
    settings = survey.get("settings") or {}
    respondent_id = payload.get("respondent_id")
    if settings.get("no_duplicates") and respondent_id:
        existing = supabase.table("responses").select("id").eq(
            "survey_id", survey_id
        ).eq("respondent_id", respondent_id).execute().data
        if existing:
            raise HTTPException(409, "You have already submitted a response to this survey.")

    # ── Insert response ──
    response = supabase.table("responses").insert({
        "survey_id": survey_id,
        "status": payload.get("status", "complete"),
        "respondent_id": respondent_id,
        "metadata": payload.get("metadata", {}),
        "completed_at": datetime.now(timezone.utc).isoformat() if payload.get("status") == "complete" else None,
    }).execute()

    response_id = response.data[0]["id"]

    if payload.get("answers"):
        answers = [{"response_id": response_id, "question_id": a["question_id"], "value": a["value"]}
                   for a in payload["answers"]]
        supabase.table("answers").insert(answers).execute()

    # ── Notifications ──────────────────────────────────────────────────────
    owner_id = survey.get("created_by") if isinstance(survey, dict) else None
    if owner_id and payload.get("status") == "complete":
        # Count total completed responses after this one
        total = supabase.table("responses").select(
            "id", count="exact"
        ).eq("survey_id", survey_id).eq("status", "complete").execute().count or 0
        surv_title = supabase.table("surveys").select("title").eq(
            "id", survey_id
        ).single().execute().data.get("title", "Survey")
        link = f"/surveys/{survey_id}?tab=insights"

        # New response notification
        _notify(owner_id, "new_response",
                f'New response on "{surv_title}"',
                f"You have {total} total response{'s' if total != 1 else ''}.",
                survey_id=survey_id, link=link)

        # Milestone notifications
        for milestone in (10, 50, 100, 500, 1000):
            if total == milestone:
                _notify(owner_id, "milestone",
                        f'🎉 {milestone} responses on "{surv_title}"!',
                        f"Your survey just hit {milestone} completed responses.",
                        survey_id=survey_id, link=link)
                break

    return {"response_id": response_id}


# ─── Team invites ────────────────────────────────────────────────────────────

@app.post("/admin/invite")
def invite_user(payload: dict):
    """Send a Supabase Auth invite email with the specified role."""
    import httpx

    email = payload.get("email", "").strip()
    role  = payload.get("role", "member")

    if not email:
        raise HTTPException(400, "email is required")
    if role not in ("admin", "member", "viewer"):
        raise HTTPException(400, "role must be admin, member, or viewer")

    redirect_to = f"{FRONTEND_URL}/auth/callback?next=/"

    resp = httpx.post(
        f"{SUPABASE_URL}/auth/v1/invite",
        headers={
            "apikey": SUPABASE_SECRET_KEY,
            "Authorization": f"Bearer {SUPABASE_SECRET_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "email": email,
            "data": {"role": role},
            "redirect_to": redirect_to,
        },
        timeout=10,
    )

    if resp.status_code not in (200, 201):
        body = resp.json()
        detail = (
            body.get("msg")
            or body.get("error_description")
            or body.get("error")
            or resp.text
        )
        raise HTTPException(resp.status_code, detail)

    # Notify the inviting user (admin/owner who sent the invite)
    inviter_id = payload.get("inviter_id")
    if inviter_id:
        _notify(inviter_id, "team_invite",
                f"Invite sent to {email}",
                f"{email} has been invited as {role}. They'll receive a magic-link email.")

    return {"invited": email, "role": role, "redirect_to": redirect_to}


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
        "created_by": payload.get("created_by"),
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


# ─── Notifications ────────────────────────────────────────────────────────────

def _notify(user_id: str, type_: str, title: str, message: str = None,
            survey_id: str = None, link: str = None):
    """Helper — insert a notification. Silently ignores errors."""
    try:
        supabase.table("notifications").insert({
            "user_id": user_id, "type": type_, "title": title,
            "message": message, "survey_id": survey_id, "link": link,
        }).execute()
    except Exception:
        pass


@app.get("/notifications")
def list_notifications(user_id: str, limit: int = 20):
    result = supabase.table("notifications").select("*").eq(
        "user_id", user_id
    ).order("created_at", desc=True).limit(limit).execute()
    return result.data


@app.get("/notifications/unread-count")
def unread_count(user_id: str):
    result = supabase.table("notifications").select(
        "id", count="exact"
    ).eq("user_id", user_id).eq("read", False).execute()
    return {"count": result.count or 0}


@app.patch("/notifications/{notification_id}/read")
def mark_read(notification_id: str, payload: dict):
    user_id = payload.get("user_id")
    supabase.table("notifications").update({"read": True}).eq(
        "id", notification_id
    ).eq("user_id", user_id).execute()
    return {"ok": True}


@app.patch("/notifications/read-all")
def mark_all_read(payload: dict):
    user_id = payload.get("user_id")
    supabase.table("notifications").update({"read": True}).eq(
        "user_id", user_id
    ).eq("read", False).execute()
    return {"ok": True}


# ─── Analytics ───────────────────────────────────────────────────────────────

@app.get("/surveys/{survey_id}/analytics/crosstab")
def crosstab(survey_id: str, row_qid: str, col_qid: str):
    """Cross-tabulation: frequency of row question responses × col question responses."""
    answers = supabase.table("answers").select("response_id, question_id, value").in_(
        "question_id", [row_qid, col_qid]
    ).execute().data

    # Only include complete, non-discarded responses
    responses = supabase.table("responses").select("id").eq("survey_id", survey_id).in_(
        "status", ["complete", "partial"]
    ).execute().data
    valid_ids = {r["id"] for r in responses}

    # Build per-response answer map
    resp_map: dict[str, dict[str, str]] = {}
    for a in answers:
        if a["response_id"] not in valid_ids:
            continue
        rid = a["response_id"]
        qid = a["question_id"]
        val = a["value"]
        if isinstance(val, dict):
            if "text" in val:    display = str(val["text"])
            elif "number" in val: display = str(val["number"])
            elif "choice" in val: display = str(val["choice"])
            elif "options" in val: display = ", ".join(val["options"])
            else: display = ""
        else:
            display = str(val) if val else ""
        resp_map.setdefault(rid, {})[qid] = display

    # Collect unique values for each question
    row_vals: list[str] = []
    col_vals: list[str] = []
    for answers_by_q in resp_map.values():
        rv = answers_by_q.get(row_qid, "")
        cv = answers_by_q.get(col_qid, "")
        if rv and rv not in row_vals: row_vals.append(rv)
        if cv and cv not in col_vals: col_vals.append(cv)
    row_vals.sort(); col_vals.sort()

    # Build count matrix
    counts: dict[str, dict[str, int]] = {rv: {cv: 0 for cv in col_vals} for rv in row_vals}
    row_totals: dict[str, int] = {rv: 0 for rv in row_vals}
    col_totals: dict[str, int] = {cv: 0 for cv in col_vals}
    grand_total = 0

    for answers_by_q in resp_map.values():
        rv = answers_by_q.get(row_qid, "")
        cv = answers_by_q.get(col_qid, "")
        if rv in counts and cv in counts[rv]:
            counts[rv][cv] += 1
            row_totals[rv] += 1
            col_totals[cv] += 1
            grand_total += 1

    return {
        "row_values": row_vals,
        "col_values": col_vals,
        "counts": counts,
        "row_totals": row_totals,
        "col_totals": col_totals,
        "grand_total": grand_total,
    }


# ─── Analytics: correlation + drivers ────────────────────────────────────────

def _numeric_answers(survey_id: str, question_ids: list[str]) -> dict[str, list[float]]:
    """Return {question_id: [numeric values]} from complete responses."""
    responses = supabase.table("responses").select("id").eq("survey_id", survey_id).in_(
        "status", ["complete"]
    ).execute().data
    valid_ids = {r["id"] for r in responses}
    if not valid_ids or not question_ids:
        return {}

    answers_raw = supabase.table("answers").select("response_id, question_id, value").in_(
        "question_id", question_ids
    ).execute().data

    # Build response-keyed map  {response_id: {question_id: numeric_value}}
    rmap: dict[str, dict[str, float]] = {}
    for a in answers_raw:
        if a["response_id"] not in valid_ids:
            continue
        val = a["value"]
        num = None
        if isinstance(val, dict):
            if "number" in val: num = float(val["number"])
            elif "text" in val:
                try: num = float(val["text"])
                except: pass
        try:
            if num is None: num = float(val)
        except: pass
        if num is not None:
            rmap.setdefault(a["response_id"], {})[a["question_id"]] = num

    # Convert to per-question value lists (paired — same response IDs only)
    all_resp = sorted(valid_ids)
    result: dict[str, list[float]] = {qid: [] for qid in question_ids}
    for rid in all_resp:
        row = rmap.get(rid, {})
        if all(qid in row for qid in question_ids):
            for qid in question_ids:
                result[qid].append(row[qid])
    return result


def _pearson(x: list, y: list):
    """Pearson correlation coefficient."""
    import math
    n = len(x)
    if n < 3:
        return None
    mx, my = sum(x)/n, sum(y)/n
    num = sum((a - mx) * (b - my) for a, b in zip(x, y))
    dx  = math.sqrt(sum((a - mx)**2 for a in x))
    dy  = math.sqrt(sum((b - my)**2 for b in y))
    if dx == 0 or dy == 0:
        return None
    return round(num / (dx * dy), 3)


@app.get("/surveys/{survey_id}/analytics/correlation")
def correlation_matrix(survey_id: str):
    """Pearson correlation matrix for all numeric/scale questions."""
    SCALE_TYPES = {"rating", "nps", "slider", "numeric_input", "likert_matrix"}
    questions = supabase.table("questions").select("id, title, type, position").eq(
        "survey_id", survey_id
    ).execute().data
    scale_qs = [q for q in questions if q["type"] in SCALE_TYPES]

    if len(scale_qs) < 2:
        return {"questions": [], "matrix": {}, "n": 0}

    qids = [q["id"] for q in scale_qs]
    vals = _numeric_answers(survey_id, qids)
    n = len(next(iter(vals.values()), []))

    matrix: dict[str, dict[str, float | None]] = {}
    for q1 in scale_qs:
        matrix[q1["id"]] = {}
        for q2 in scale_qs:
            if q1["id"] == q2["id"]:
                matrix[q1["id"]][q2["id"]] = 1.0
            else:
                v1, v2 = vals.get(q1["id"], []), vals.get(q2["id"], [])
                matrix[q1["id"]][q2["id"]] = _pearson(v1, v2)

    return {
        "questions": [{"id": q["id"], "title": q["title"], "type": q["type"]} for q in scale_qs],
        "matrix": matrix,
        "n": n,
    }


@app.get("/surveys/{survey_id}/analytics/drivers")
def driver_analysis(survey_id: str, outcome_qid: str):
    """Correlation of every other question with the chosen outcome question."""
    questions = supabase.table("questions").select("id, title, type, position").eq(
        "survey_id", survey_id
    ).execute().data

    SCALE_TYPES = {"rating", "nps", "slider", "numeric_input"}
    predictor_qs = [q for q in questions if q["id"] != outcome_qid and q["type"] in SCALE_TYPES]
    if not predictor_qs:
        return {"outcome": None, "drivers": [], "n": 0}

    outcome_q = next((q for q in questions if q["id"] == outcome_qid), None)
    if not outcome_q:
        raise HTTPException(404, "Outcome question not found")

    all_qids = [outcome_qid] + [q["id"] for q in predictor_qs]
    vals = _numeric_answers(survey_id, all_qids)
    n = len(vals.get(outcome_qid, []))

    drivers = []
    for q in predictor_qs:
        r = _pearson(vals.get(outcome_qid, []), vals.get(q["id"], []))
        drivers.append({
            "question_id": q["id"],
            "title": q["title"],
            "type": q["type"],
            "correlation": r,
            "abs_correlation": abs(r) if r is not None else None,
        })

    drivers.sort(key=lambda d: d["abs_correlation"] or 0, reverse=True)
    return {"outcome": {"id": outcome_q["id"], "title": outcome_q["title"]}, "drivers": drivers, "n": n}


# ─── Branding (public) ───────────────────────────────────────────────────────

@app.get("/surveys/{survey_id}/branding")
def get_branding(survey_id: str):
    """Return brand color + logo for the survey owner. Public — no auth required."""
    survey = supabase.table("surveys").select("created_by").eq("id", survey_id).single().execute().data
    if not survey or not survey.get("created_by"):
        return {"brand_color": "#2E5BFF", "logo_url": None, "org_name": "SurveyAI"}

    profile = supabase.table("profiles").select(
        "brand_color, logo_url, org_name, full_name"
    ).eq("id", survey["created_by"]).single().execute().data

    if not profile:
        return {"brand_color": "#2E5BFF", "logo_url": None, "org_name": "SurveyAI"}

    return {
        "brand_color": profile.get("brand_color") or "#2E5BFF",
        "logo_url": profile.get("logo_url"),
        "org_name": profile.get("org_name") or profile.get("full_name") or "SurveyAI",
    }


# ─── Logic Rules ─────────────────────────────────────────────────────────────

@app.get("/surveys/{survey_id}/logic")
def list_logic(survey_id: str):
    result = supabase.table("survey_logic").select("*").eq("survey_id", survey_id).order("position").execute()
    return result.data


@app.post("/surveys/{survey_id}/logic")
def create_logic(survey_id: str, payload: dict):
    payload["survey_id"] = survey_id
    result = supabase.table("survey_logic").insert(payload).execute()
    return result.data[0]


@app.put("/surveys/{survey_id}/logic/{rule_id}")
def update_logic(survey_id: str, rule_id: str, payload: dict):
    result = supabase.table("survey_logic").update(payload).eq("id", rule_id).eq("survey_id", survey_id).execute()
    return result.data[0]


@app.delete("/surveys/{survey_id}/logic/{rule_id}")
def delete_logic(survey_id: str, rule_id: str):
    supabase.table("survey_logic").delete().eq("id", rule_id).eq("survey_id", survey_id).execute()
    return {"deleted": rule_id}


# ─── Responses (detail, update, delete) ──────────────────────────────────────

@app.get("/surveys/{survey_id}/responses-full")
def get_responses_full(survey_id: str):
    """All responses with their answers and question metadata."""
    questions = (supabase.table("questions")
        .select("id, title, type, position")
        .eq("survey_id", survey_id)
        .order("position")
        .execute().data)

    responses = (supabase.table("responses")
        .select("id, status, started_at, completed_at, metadata")
        .eq("survey_id", survey_id)
        .order("started_at", desc=True)
        .execute().data)

    if not responses:
        return {"questions": questions, "responses": []}

    response_ids = [r["id"] for r in responses]
    answers_raw = (supabase.table("answers")
        .select("response_id, question_id, value")
        .in_("response_id", response_ids)
        .execute().data)

    # Index: {response_id: {question_id: display_value}}
    answer_index: dict = {}
    for a in answers_raw:
        rid, qid, val = a["response_id"], a["question_id"], a["value"]
        if isinstance(val, dict):
            if "text" in val:   display = str(val["text"])
            elif "number" in val: display = str(val["number"])
            elif "choice" in val: display = str(val["choice"])
            elif "options" in val: display = ", ".join(val["options"])
            else: display = json.dumps(val)
        else:
            display = str(val)
        answer_index.setdefault(rid, {})[qid] = display

    # Attach answers to each response
    for r in responses:
        r["answers"] = answer_index.get(r["id"], {})

    return {"questions": questions, "responses": responses}


@app.patch("/surveys/{survey_id}/responses/{response_id}")
def update_response_status(survey_id: str, response_id: str, payload: dict):
    """Update response status — disqualified, partial, complete."""
    status = payload.get("status")
    if status not in ("complete", "partial", "disqualified"):
        raise HTTPException(400, "status must be complete, partial, or disqualified")
    result = (supabase.table("responses")
        .update({"status": status})
        .eq("id", response_id)
        .eq("survey_id", survey_id)
        .execute())
    return {"updated": response_id, "status": status}


@app.delete("/surveys/{survey_id}/responses/{response_id}")
def delete_response(survey_id: str, response_id: str):
    """Permanently delete a response and its answers."""
    supabase.table("answers").delete().eq("response_id", response_id).execute()
    supabase.table("responses").delete().eq("id", response_id).eq("survey_id", survey_id).execute()
    return {"deleted": response_id}


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

PLAN_PRICES = {"starter": "$29.00", "pro": "$79.00"}

@app.post("/billing/token-upgrade")
def token_upgrade(payload: dict):
    """Token-based dummy payment — upgrades plan and logs the transaction."""
    user_id = payload.get("user_id")
    plan    = payload.get("plan")
    token   = payload.get("token", "").strip()

    if not user_id or plan not in ("starter", "pro"):
        raise HTTPException(400, "user_id and a valid plan (starter/pro) are required")
    if not token:
        raise HTTPException(400, "Payment token is required")

    # Get current plan for logging
    profile = supabase.table("profiles").select("plan").eq("id", user_id).single().execute().data
    prev_plan = profile.get("plan", "free") if profile else "free"

    if prev_plan == plan:
        raise HTTPException(400, f"You are already on the {plan} plan")

    # Update plan in profiles
    supabase.table("profiles").update({
        "plan": plan,
        "plan_status": "active",
    }).eq("id", user_id).execute()

    # Log the transaction
    supabase.table("billing_logs").insert({
        "user_id": user_id,
        "plan": plan,
        "prev_plan": prev_plan,
        "token": token[:8] + "****",   # mask most of token for security
        "amount": PLAN_PRICES.get(plan, "$0.00"),
        "status": "success",
        "note": f"Upgraded from {prev_plan} to {plan} via payment token",
    }).execute()

    _notify(user_id, "plan_upgrade",
            f"Plan upgraded to {plan.capitalize()} 🎉",
            f"You're now on the {plan.capitalize()} plan ({PLAN_PRICES.get(plan, '')}). Enjoy your new limits!")

    return {"success": True, "plan": plan, "message": f"Successfully upgraded to {plan.capitalize()} plan"}


@app.get("/billing/logs")
def get_billing_logs(user_id: str):
    """Return billing transaction history for a user."""
    result = supabase.table("billing_logs").select("*").eq(
        "user_id", user_id
    ).order("created_at", desc=True).execute()
    return result.data



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


# ─── GDPR ─────────────────────────────────────────────────────────────────────

@app.get("/gdpr/export")
def gdpr_export(user_id: str, format: str = "json"):
    """Export all data for a user (surveys, questions, responses, profile)."""
    if not user_id:
        raise HTTPException(400, "user_id required")

    profile = supabase.table("profiles").select("*").eq("id", user_id).execute().data
    surveys = supabase.table("surveys").select("*").eq("created_by", user_id).execute().data
    survey_ids = [s["id"] for s in surveys]

    questions = []
    responses = []
    answers = []
    if survey_ids:
        questions = supabase.table("questions").select("*").in_("survey_id", survey_ids).execute().data
        responses = supabase.table("responses").select("*").in_("survey_id", survey_ids).execute().data
        response_ids = [r["id"] for r in responses]
        if response_ids:
            answers = supabase.table("answers").select("*").in_("response_id", response_ids).execute().data

    payload = {
        "exported_at": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "user_id": user_id,
        "profile": profile[0] if profile else {},
        "surveys": surveys,
        "questions": questions,
        "responses": responses,
        "answers": answers,
    }

    if format == "csv":
        output = io.StringIO()
        w = csv.writer(output)
        # Profile
        w.writerow(["=== PROFILE ==="])
        if profile:
            w.writerow(list(profile[0].keys()))
            w.writerow(list(profile[0].values()))
        w.writerow([])
        # Surveys
        w.writerow(["=== SURVEYS ==="])
        if surveys:
            w.writerow(list(surveys[0].keys()))
            for s in surveys:
                w.writerow(list(s.values()))
        w.writerow([])
        # Responses
        w.writerow(["=== RESPONSES ==="])
        if responses:
            w.writerow(list(responses[0].keys()))
            for r in responses:
                w.writerow(list(r.values()))
        w.writerow([])
        # Answers
        w.writerow(["=== ANSWERS ==="])
        if answers:
            w.writerow(list(answers[0].keys()))
            for a in answers:
                w.writerow(list(a.values()))

        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="surveyai_data_{user_id[:8]}.csv"'},
        )

    return StreamingResponse(
        iter([json.dumps(payload, indent=2, default=str)]),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="surveyai_data_{user_id[:8]}.json"'},
    )


@app.delete("/gdpr/delete-account")
def gdpr_delete_account(payload: dict):
    """Delete all data for a user. Surveys and responses cascade from DB constraints."""
    user_id = payload.get("user_id", "").strip()
    confirm = payload.get("confirm", "")
    if not user_id:
        raise HTTPException(400, "user_id required")
    if confirm != "DELETE MY ACCOUNT":
        raise HTTPException(400, "Confirmation text does not match")

    # Delete surveys (responses/answers cascade via FK)
    supabase.table("surveys").delete().eq("created_by", user_id).execute()
    # Delete profile
    supabase.table("profiles").delete().eq("id", user_id).execute()
    # Delete auth user via admin API
    try:
        supabase.auth.admin.delete_user(user_id)
    except Exception:
        pass  # If auth delete fails, data is still gone

    return {"deleted": True}
