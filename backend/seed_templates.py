"""Seed starter templates into Supabase."""
import json
from dotenv import load_dotenv
import os
from supabase import create_client

load_dotenv()
sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SECRET_KEY"))

TEMPLATES = [
  {
    "name": "Net Promoter Score (NPS)",
    "category": "Customer",
    "description": "Measure customer loyalty with the industry-standard 0–10 scale.",
    "structure": {
      "title": "Net Promoter Score Survey",
      "questions": [
        {"type": "nps", "title": "How likely are you to recommend us to a friend or colleague?", "required": True},
        {"type": "single_choice", "title": "What best describes you?", "required": False,
         "options": ["Customer", "Partner", "Prospect", "Other"]},
        {"type": "long_text", "title": "What's the main reason for your score?", "required": False},
        {"type": "long_text", "title": "What could we do to improve your experience?", "required": False},
      ]
    }
  },
  {
    "name": "Customer Satisfaction (CSAT)",
    "category": "Customer",
    "description": "Quickly gauge how satisfied customers are after an interaction.",
    "structure": {
      "title": "Customer Satisfaction Survey",
      "questions": [
        {"type": "rating", "title": "How satisfied are you with your experience today?", "required": True},
        {"type": "single_choice", "title": "What brought you to us today?",
         "required": False, "options": ["Purchase", "Support request", "General inquiry", "Other"]},
        {"type": "single_choice", "title": "Was your issue resolved?",
         "required": False, "options": ["Yes, fully", "Partially", "No"]},
        {"type": "long_text", "title": "Any additional comments?", "required": False},
      ]
    }
  },
  {
    "name": "Post-Purchase Feedback",
    "category": "Customer",
    "description": "Collect feedback right after a purchase to spot friction and delight.",
    "structure": {
      "title": "Post-Purchase Feedback",
      "questions": [
        {"type": "rating", "title": "How would you rate your overall purchase experience?", "required": True},
        {"type": "single_choice", "title": "How did you hear about us?",
         "required": False, "options": ["Search engine", "Social media", "Friend/colleague", "Advertisement", "Other"]},
        {"type": "single_choice", "title": "How easy was the checkout process?",
         "required": False, "options": ["Very easy", "Easy", "Neutral", "Difficult", "Very difficult"]},
        {"type": "long_text", "title": "What could we improve?", "required": False},
      ]
    }
  },
  {
    "name": "Employee Pulse Check",
    "category": "Employee",
    "description": "A quick weekly/monthly check-in to track team morale and engagement.",
    "structure": {
      "title": "Employee Pulse Survey",
      "questions": [
        {"type": "rating", "title": "How would you rate your overall job satisfaction this week?", "required": True},
        {"type": "single_choice", "title": "Do you feel your work is meaningful?",
         "required": True, "options": ["Always", "Often", "Sometimes", "Rarely", "Never"]},
        {"type": "single_choice", "title": "Do you have the resources you need to do your job well?",
         "required": True, "options": ["Yes", "Mostly", "Somewhat", "No"]},
        {"type": "single_choice", "title": "How would you rate team collaboration this week?",
         "required": False, "options": ["Excellent", "Good", "Fair", "Poor"]},
        {"type": "long_text", "title": "Anything you'd like to share with leadership?", "required": False},
      ]
    }
  },
  {
    "name": "360° Employee Review",
    "category": "Employee",
    "description": "Structured peer and manager feedback for performance reviews.",
    "structure": {
      "title": "Employee Review Survey",
      "questions": [
        {"type": "rating", "title": "How effectively does this person communicate?", "required": True},
        {"type": "rating", "title": "How well does this person collaborate with the team?", "required": True},
        {"type": "rating", "title": "How consistently does this person meet deadlines?", "required": True},
        {"type": "single_choice", "title": "What best describes this person's impact on the team?",
         "required": True, "options": ["Exceptional contributor", "Strong performer", "Meets expectations", "Needs improvement"]},
        {"type": "long_text", "title": "What are this person's greatest strengths?", "required": False},
        {"type": "long_text", "title": "Where do you see the most room for growth?", "required": False},
      ]
    }
  },
  {
    "name": "Event Feedback",
    "category": "Event",
    "description": "Capture attendee feedback right after a conference, webinar, or workshop.",
    "structure": {
      "title": "Event Feedback Survey",
      "questions": [
        {"type": "rating", "title": "How would you rate the event overall?", "required": True},
        {"type": "rating", "title": "How relevant was the content to your needs?", "required": True},
        {"type": "single_choice", "title": "Would you attend a future event from us?",
         "required": True, "options": ["Definitely yes", "Probably yes", "Not sure", "Probably not", "Definitely not"]},
        {"type": "multi_select", "title": "Which sessions did you find most valuable?",
         "required": False, "options": ["Keynote", "Workshops", "Panels", "Networking", "Q&A sessions"]},
        {"type": "single_choice", "title": "How did you hear about this event?",
         "required": False, "options": ["Email invite", "Social media", "Colleague", "Website", "Other"]},
        {"type": "long_text", "title": "What could we improve for next time?", "required": False},
      ]
    }
  },
  {
    "name": "Concept Testing",
    "category": "Research",
    "description": "Validate a new product, feature, or idea before you build it.",
    "structure": {
      "title": "Concept Test Survey",
      "questions": [
        {"type": "single_choice", "title": "How appealing is this concept to you?",
         "required": True, "options": ["Very appealing", "Somewhat appealing", "Neutral", "Not very appealing", "Not at all appealing"]},
        {"type": "single_choice", "title": "How likely are you to use this if it were available?",
         "required": True, "options": ["Very likely", "Likely", "Neutral", "Unlikely", "Very unlikely"]},
        {"type": "single_choice", "title": "How unique is this compared to existing solutions?",
         "required": True, "options": ["Very unique", "Somewhat unique", "Similar to others", "Not unique at all"]},
        {"type": "ranking", "title": "Rank the following features by importance to you:",
         "required": False, "options": ["Ease of use", "Price", "Features", "Support", "Speed"]},
        {"type": "long_text", "title": "What would make this more compelling for you?", "required": False},
        {"type": "long_text", "title": "What concerns do you have about this concept?", "required": False},
      ]
    }
  },
  {
    "name": "Product Feedback",
    "category": "Research",
    "description": "Gather structured feedback on an existing product or feature.",
    "structure": {
      "title": "Product Feedback Survey",
      "questions": [
        {"type": "nps", "title": "How likely are you to recommend this product to a colleague?", "required": True},
        {"type": "rating", "title": "How easy is the product to use?", "required": True},
        {"type": "multi_select", "title": "Which features do you use most?",
         "required": False, "options": ["Dashboard", "Reports", "Integrations", "Mobile app", "API"]},
        {"type": "single_choice", "title": "How often do you use the product?",
         "required": False, "options": ["Daily", "Several times a week", "Weekly", "Monthly", "Rarely"]},
        {"type": "long_text", "title": "What's the one thing you'd change about the product?", "required": False},
        {"type": "long_text", "title": "Is there a feature you wish we had?", "required": False},
      ]
    }
  },
  {
    "name": "Website UX Feedback",
    "category": "Research",
    "description": "Understand how visitors navigate and experience your website.",
    "structure": {
      "title": "Website UX Feedback",
      "questions": [
        {"type": "single_choice", "title": "What brought you to our website today?",
         "required": True, "options": ["Looking for information", "Making a purchase", "Support", "Just browsing", "Other"]},
        {"type": "single_choice", "title": "Did you find what you were looking for?",
         "required": True, "options": ["Yes, easily", "Yes, with difficulty", "Partially", "No"]},
        {"type": "rating", "title": "How would you rate the overall design of our website?", "required": True},
        {"type": "single_choice", "title": "How easy is it to navigate the site?",
         "required": True, "options": ["Very easy", "Easy", "Neutral", "Difficult", "Very difficult"]},
        {"type": "long_text", "title": "What would improve your experience on this site?", "required": False},
      ]
    }
  },
  {
    "name": "New User Onboarding",
    "category": "Product",
    "description": "Learn how new users experience your onboarding flow.",
    "structure": {
      "title": "Onboarding Experience Survey",
      "questions": [
        {"type": "rating", "title": "How easy was it to get started with our product?", "required": True},
        {"type": "single_choice", "title": "Did you complete the onboarding steps?",
         "required": True, "options": ["Yes, all of them", "Most of them", "Some of them", "None"]},
        {"type": "single_choice", "title": "How long did it take you to set up?",
         "required": False, "options": ["Under 5 minutes", "5–15 minutes", "15–30 minutes", "Over 30 minutes"]},
        {"type": "long_text", "title": "What was the most confusing part of getting started?", "required": False},
        {"type": "long_text", "title": "What would have made setup easier?", "required": False},
      ]
    }
  },
  {
    "name": "Churn / Exit Survey",
    "category": "Customer",
    "description": "Understand why customers cancel and what could have kept them.",
    "structure": {
      "title": "Exit Survey",
      "questions": [
        {"type": "single_choice", "title": "What is the primary reason you're leaving?",
         "required": True, "options": ["Too expensive", "Missing features", "Switching to a competitor", "No longer need it", "Poor experience", "Other"]},
        {"type": "single_choice", "title": "How likely are you to return in the future?",
         "required": True, "options": ["Very likely", "Somewhat likely", "Unlikely", "Very unlikely"]},
        {"type": "single_choice", "title": "Which competitor are you switching to (if any)?",
         "required": False, "options": ["Competitor A", "Competitor B", "Competitor C", "Not switching", "Prefer not to say"]},
        {"type": "long_text", "title": "What could we have done to keep you?", "required": False},
        {"type": "long_text", "title": "Any final feedback for our team?", "required": False},
      ]
    }
  },
  {
    "name": "Training Effectiveness",
    "category": "Employee",
    "description": "Measure the impact and quality of a training session or program.",
    "structure": {
      "title": "Training Feedback Survey",
      "questions": [
        {"type": "rating", "title": "How would you rate this training overall?", "required": True},
        {"type": "rating", "title": "How relevant was the content to your role?", "required": True},
        {"type": "single_choice", "title": "How confident are you in applying what you learned?",
         "required": True, "options": ["Very confident", "Confident", "Somewhat confident", "Not confident"]},
        {"type": "single_choice", "title": "How would you rate the trainer/facilitator?",
         "required": True, "options": ["Excellent", "Good", "Average", "Below average"]},
        {"type": "long_text", "title": "What was the most valuable takeaway?", "required": False},
        {"type": "long_text", "title": "What could be improved in future sessions?", "required": False},
      ]
    }
  },
]

# Clear existing and seed fresh
sb.table("templates").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

for t in TEMPLATES:
    sb.table("templates").insert({
        "name": t["name"],
        "category": t["category"],
        "description": t["description"],
        "structure": t["structure"],
        "is_public": True,
    }).execute()
    print(f"✓ {t['name']}")

print(f"\nSeeded {len(TEMPLATES)} templates.")
