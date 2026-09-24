---
framework_version: 1.0.0
---

# Interview Preparation Guide

<!-- SETUP: STAR examples are personalized by running /setup based on your actual experience -->

## STAR Format

Structure answers as: **Situation** (context), **Task** (your responsibility), **Action** (what you did), **Result** (outcome).

Keep answers to 1-2 minutes. Be specific. End with what you learned or would do differently.

## Ready-Made STAR Examples

<!-- These are populated by /setup from your actual experience. Below are templates showing the format. -->

### 1. Driftline (MLOps ownership, evaluation rigor)
**S:** Building a streaming fraud-detection system meant the model had to keep working as fraud patterns and data distributions shifted over time, not just perform well on a static test set.
**T:** Design and build a pipeline that could both detect fraud in near-real-time and detect its own performance drift before it silently degraded.
**A:** Replayed 590K transactions through Redpanda/PyFlink, engineered a GraphSAGE model over a 605K-node identity graph with unit-tested leakage controls, evaluated XGBoost with a chronological (not random) split to get an honest performance estimate, and implemented drift-triggered retraining behind a promotion gate that only swapped in a new model if it beat the incumbent on the same holdout.
**R:** Chronological-split evaluation surfaced a large PR-AUC gap versus random-split (0.4751 vs. 0.6974) that would otherwise have hidden a false sense of confidence; the promotion gate correctly selected the candidate model (0.4802 vs. 0.2811 PR-AUC). Deployed inference via ONNX/FastAPI on GCP and load-tested to 10,018 requests with zero failures at 380ms p95 latency.
**Use for:** "Tell me about a time you caught a mistake before it caused a problem", "Describe an MLOps/production ML system you built", "How do you evaluate whether a model is good enough to ship?"

### 2. InterviewPilot (Full-stack AI system design, reliability)
**S:** An AI-driven interview platform needed to evaluate free-form answers reliably, even though LLM outputs and external speech-to-text calls can fail or return malformed data.
**T:** Build the React/FastAPI application end-to-end and make the AI-dependent parts resilient rather than brittle.
**A:** Implemented persistent sessions, Groq transcription, schema-validated AI answer evaluation with bounded agentic follow-ups, added repair loops for malformed model output, and built disclosed fallback scoring for when AI services were unavailable rather than failing silently.
**R:** Shipped a working system validated by 19 backend tests at 89% statement coverage, plus CI browser checks covering the full flow from session creation to report generation, with external AI calls mocked or disabled in tests to keep CI deterministic.
**Use for:** "Tell me about a system you designed for reliability", "How do you handle external dependencies that can fail?", "Describe a full-stack project you built independently"

### 3. SAFE-RAG / Text-to-SQL research (Applied research rigor)
**S:** RAG systems and Text-to-SQL tools are often evaluated only on whether the output looks plausible, not on whether it is actually grounded or safe to trust as schemas and data evolve.
**T:** As first author on both projects, design evaluation methodology that would surface failure modes a superficial accuracy metric would miss.
**A:** For SAFE-RAG, built a schema-validated evaluation pipeline requiring supporting citations across 200 annotated items. For the Text-to-SQL project, built a 1,382-instance benchmark across 20 databases and ran 27,384 model generations to test whether models could detect when a schema change made a query unanswerable.
**R:** SAFE-RAG identified an 8.6% wrong-scope grounding rate that a naive accuracy check would have missed (short paper under review at ALTA 2026). The Text-to-SQL benchmark detected 79.5% of structurally invisible drift at a 13.0% false-alarm rate, evaluated against 5,627 benign updates (manuscript complete).
**Use for:** "Tell me about a research project you led", "How do you approach evaluating an AI system?", "Describe a time you found a problem others might have missed"

### 4. Joget Inc. internship (Cross-functional delivery under process)
**S:** As an intern on a small Agile team, workflow automations and UI components needed to reach client teams through the same production release cycles as work from senior engineers.
**T:** Deliver working automations and REST API integrations on schedule while learning the team's existing codebase and processes.
**A:** Built and deployed Joget DX workflow automations and UI components, working directly with senior engineers, QA, and product managers in sprint ceremonies; integrated REST APIs to remove manual data re-entry.
**R:** Delivered functioning modules through multiple recurring production release cycles, and gained direct experience working inside an established Agile process rather than only on independent projects.
**Use for:** "Tell me about working on a team", "Describe your experience in an Agile environment", "Tell me about ramping up on an unfamiliar codebase"

<!-- Add more STAR examples as needed. Aim for 4-6 covering different competencies. -->

## Common Tough Questions

### "Why did you leave Joget?"
> The internship was a fixed-term Software Developer Intern role (Oct 2024 - Mar 2025) that ended on schedule as I completed my degree; frame as a planned transition from internship to full-time work, not a departure.

### "You don't have [specific skill/experience]."
> Acknowledge the specific gap honestly, then bridge to the closest adjacent project or research work (e.g. no production Kubernetes experience, but Driftline's Docker/ONNX/FastAPI deployment on GCP demonstrates the same deployment discipline) and note the deliberate pace at which independent projects have been used to close skill gaps.

### "Where do you see yourself in 5 years?"
> Growing from independent applied-AI projects and first-author research into owning production ML/LLM systems at increasing scope, ideally staying close to both the engineering and evaluation/research side of the work.

### "What's your biggest weakness?"
> Limited experience working inside large, multi-team engineering organizations - the internship was a small team and independent projects are solo work. Mitigation: actively sought out cross-functional exposure at Joget (QA, product managers) and structured research work (SAFE-RAG, Text-to-SQL benchmark) to build the collaboration and process discipline a larger team expects.

### "Why this company specifically?"
> Customize per company. Must reference: specific projects, company values, market position, or team structure. Never give a generic answer.

## Questions You Should Ask Interviewers

### About the Role
- "What does a typical week look like in this role?"
- "What would success look like in the first 6 months?"
- "What's the biggest challenge the team is facing right now?"

### About the Team
- "How big is the team, and how do you divide work?"
- "What does the development/project lifecycle look like, from idea to production?"
- "How do you onboard new team members?"

### About Tech & Growth
- "What's your current tech stack for [relevant area]?"
- "Is there room to grow into more architectural or strategic decisions?"
- "How does the team stay current with new tools and methods?"

### About Culture (use these to prevent disappointment)
- "How would you describe the team culture?"
- "What does professional development look like here?"
- "Is there flexibility for remote/hybrid work?"
- "What's the balance between development/new projects and maintenance work?"
- "How would you describe the leadership style in this team?"
- "What do people who thrive here have in common?"

## Phone/Video Interview Tips
- Have STAR examples written out (use this file)
- Keep a glass of water nearby
- Smile when speaking (it changes your tone)
- Ask for clarification if a question is vague
- It's OK to take 5 seconds to think before answering
- End with: "Is there anything else you'd like to know about my background?"

## After the Application (Best Practice)

### Follow-Up Etiquette
- **Don't call to "stand out"** or to learn more about the role post-submission - this risks a negative impression
- If the employer specified a timeline, respect it and wait
- If no timeline was given and significant time has passed (2+ weeks), a brief call to ask about status is acceptable
- If you have genuinely new, relevant information to share, a short follow-up is fine

### Thank-You Notes
- When you receive any update (interview invitation, rejection, or status update), send a brief thank-you message
- Express appreciation for their time and the process
- Keep it short (2-3 sentences)

## Roleplay Guidelines
When the user asks for interview practice:
1. Ask which role/company to simulate
2. Start with easy warm-up questions ("Tell me about yourself")
3. Progress to role-specific technical questions
4. Include 1-2 behavioral questions using the competencies from the job posting
5. End with a tough question or curveball
6. After each answer, give brief feedback: what worked, what to sharpen
7. Suggest which STAR example would work best for each question
