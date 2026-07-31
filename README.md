# SAT Practice Platform

A local-first **Digital SAT Practice Exam** web application built with Next.js 16, TypeScript, and Tailwind CSS v4. Powered by a 963-question database extracted from College Board Question Bank PDFs.

---

## Features

### 🏠 Bento Box Dashboard
Six-tile responsive landing page providing instant access to every module of the platform.

### 📋 Exam Suite System
- **7 Full-Length SAT Exams** — 4 modules each (R&W × 2 + Math × 2), 98 questions, 2h 14m
- **8 Reading & Writing Diagnostics** — 2 modules, 54 questions, 64 minutes
- **7 Math Diagnostics** — 2 modules, 44 questions, 70 minutes
- All static exams are **pre-generated with zero question overlap** between exams of the same type
- **🎲 Randomized Exam Generator** — dynamically samples questions on demand following the same strict difficulty distributions

### ⏱️ Exam Engine
- Strict countdown timer with auto-submit at 00:00
- Per-question dwell time logging (silent, background)
- **Module 1 difficulty distribution:** 30% Easy · 50% Medium · 20% Hard
- **Module 2 difficulty distribution (hard route):** 10% Easy · 30% Medium · 60% Hard
- MCQ radio buttons and numeric grid-in input for open-ended Math questions
- **Desmos Graphing Calculator** modal (Math modules)
- **SAT Math Reference Formula Sheet** modal
- Question navigator panel with answered/flagged/current states
- Flag-for-review per question

### 📊 Analytics & Results Dashboard
- Animated score card with count-up animation (200–800 per section, 400–1600 total)
- **Official SAT scaled score approximation:** R&W (0–54 raw → 200–800), Math (0–44 raw → 200–800)
- Recharts bar chart — time spent per question (green = correct, red = incorrect)
- Circular performance gauges
- Expandable domain accordions with skill-level correct/incorrect counts
- **Quick-Look modal** — click any chart bar or question badge to instantly preview the question, answer, and explanation

### 🔄 Review Workspace
- Historical test archive listing all completed sessions
- **Show Explanations toggle (ON / OFF)**
  - **OFF:** Blind re-attempt mode — re-answer questions without seeing correct answers
  - **ON:** Displays your original answer vs. correct answer + official explanation
- Module tabs, mini Q-dot navigator, time-spent display

### 📖 QuestionDex
A Pokédex-style persistent tracker for all 963 questions:
- **Green cards** — previously seen (shows Correct / Incorrect)
- **Grey cards** — unseen
- Live coverage bars by section, domain, and difficulty
- Full-text search + Status / Section / Domain / Difficulty filters
- Click any card to launch a **single-item practice modal** with a live timer
- Answers instantly flip card state and update coverage stats — not logged to test history

### 🛠️ Custom Question Bank
- Build targeted practice sets with cascading filters: Section → Domain → Skill → Difficulty
- Question count slider (5–100)
- Live pool preview with difficulty breakdown
- Launches directly into the exam engine

---

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16 (App Router) | Framework |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |
| KaTeX | 0.18.x | LaTeX math rendering |
| Recharts | 3.x | Analytics charts |
| Lucide React | latest | Icons |
| Desmos | iframe embed | Graphing calculator |

---

## Project Structure

```
sat-platform/
├── public/
│   ├── questions_database.json   ← 963-question database (R&W + Math)
│   └── exam_suites.json          ← Pre-generated static exam suites
├── app/
│   ├── page.tsx                  ← Dashboard (Bento Grid)
│   ├── globals.css               ← Design system (dark mode, animations)
│   ├── layout.tsx                ← Root layout + AppProvider
│   ├── context/
│   │   └── AppContext.tsx        ← Global state (questions, QuestionDex, sessions)
│   ├── lib/
│   │   ├── db.ts                 ← Database loader, sampler, randomized exam generator
│   │   ├── storage.ts            ← localStorage abstraction
│   │   └── scoring.ts            ← SAT scaled score lookup tables
│   ├── types/
│   │   └── index.ts              ← All TypeScript interfaces
│   ├── select/[type]/            ← Exam selection screen
│   ├── exam/[sessionId]/         ← Live exam engine
│   ├── results/[sessionId]/      ← Analytics dashboard
│   ├── review/
│   │   ├── page.tsx              ← Test history archive
│   │   └── [sessionId]/          ← Question-by-question review
│   ├── questiondex/              ← QuestionDex catalog
│   └── questionbank/             ← Custom test builder
└── components/
    └── ui/                       ← Button, Modal, Badge, ProgressBar, MathRenderer
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Regenerating Exam Suites

The static exam suites in `public/exam_suites.json` are pre-generated. To regenerate them (e.g., after updating `questions_database.json`):

```bash
# From the project root (SAT PLATFORM/)
python generate_exam_suites.py
```

---

## Data Persistence

All user data is stored in **browser localStorage** — no backend or database required:

- `sat_sessions` — completed test sessions and scores
- `sat_questiondex` — per-question seen/correct/incorrect state
- `sat_in_progress` — current exam state (survives page refresh)
- `sat_completed_static` — which static exam IDs have been completed

---

## Question Database Schema

```jsonc
{
  "question_id": "618d94c4",
  "section": "Reading and Writing" | "Math",
  "domain": "Algebra",
  "skill": "Linear equations in one variable",
  "difficulty": "Easy" | "Medium" | "Hard",
  "is_open_ended": false,          // true = numeric grid-in
  "stimulus": "Passage text...",   // may be empty string
  "question_text": "Which of the following...",
  "options": { "A": "...", "B": "...", "C": "...", "D": "..." } | null,
  "correct_answer": "B",           // letter key or numeric string
  "explanation": "Choice B is correct because..."
}
```

Math fields (`question_text`, `options`, `explanation`) use LaTeX notation delimited by `$...$` for inline and `$$...$$` for display math, rendered client-side via KaTeX.
