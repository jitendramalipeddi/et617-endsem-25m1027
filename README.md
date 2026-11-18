# Student Sabha: Collaborative Problem-Solving & Inclusivity Platform

**Course / Project:** ET617 – Educational Technology & Learning Sciences  
**Theoretical Focus:** Computer-Supported Collaborative Learning (CSCL), Group Learning, Shared Representations  
**Scenario:** Deliberating & Amending Article IV (Language of Communication) in the Classroom Constitution  
**Target Learner Profile:** Learners whose home language differs from the school medium (Telugu at home, English at school).

---

## 🌟 Key Highlights & Design Updates

* **Platform Name:** **Student Sabha**
* **Aesthetic & UI/UX:** Warm, ambient, production-grade EdTech design inspired by Notion, Linear, and Stripe with an alabaster/off-white palette, diffused pastel lighting orbs, and glassmorphic cards.
* **Progressive Disclosure Teacher Dashboard:**
  * Minimal sticky top control bar with civic badge, student counter, timer, and primary session trigger.
  * 65% Primary Left Column with segmented tabs: `[Live Deliberation Feed]` vs `[Draft Constitution & Voting]`.
  * 35% Sidebar with 4 smooth, collapsible accordions (Inclusivity Monitor, AI Scaffold Queue, Direct Teacher Interventions with one-click presets, Connected Roster). Maximum 2 accordions open simultaneously to prevent scroll overflow.

1. **Teacher-in-the-Loop (TITL) Dashboard**:
   * **Session Gatekeeper:** Students join a waiting room with task briefing and can only begin once the teacher clicks **"▶ Start Discussion"**.
   * **Live Participation & Inclusivity Monitor:** Real-time tracking of student talk-time, message count, word count, idle duration, and engagement status (`Active`, `Hesitant / Low Output`, `Silent / Disengaged`).
   * **Inequality & Skew Index:** Live Gini coefficient calculation indicating whether conversation is equitable or monopolized by one student.
   * **AI Suggestion Staging Queue:** AI facilitation prompts (silent learner nudges, dominance pacing, inquiry deepeners) are staged for teacher approval. The teacher can **Approve**, **Edit**, or **Dismiss/Override** each prompt before it reaches students.
   * **Direct Teacher Interventions:** Teacher can broadcast authoritative guidance into the chat stream anytime.
   * **Off-Topic Drift Alerter:** Automatically flags non-task chat (e.g. gaming, cricket) to the teacher with a one-click redirect prompt.

2. **Student Collaborative Workspace**:
   * **Real-Time Deliberation Room:** Chat stream with automatic epistemic tags (*Warrants*, *Proposals*, *Counter-Claims*, *Agreements*).
   * **Epistemic Sentence Starters:** Quick prompts to scaffold reasoning, translanguaging reflection, and peer respect.
   * **Shared Artefact Co-Authoring (Classroom Constitution):**
     * Live display of *Article IV: Language of Communication*.
     * **Propose Amendment Modal:** Requires both the proposed wording and a **mandatory justification of decision**.
     * **Peer Review & Consensus Voting:** Real-time voting on amendments with consensus thresholds. Once ratified, the constitution updates live for the entire class.

---

## 🚀 How to Run Locally

### 1. Start the Server
The application is pre-configured and already running on your machine:
```bash
npm start
```
By default, the server runs on:
* **Localhost:** [http://localhost:3000](http://localhost:3000)
* **Local Network IP:** `http://<your-local-ip>:3000` (Accessible from phones, tablets, or other laptops on the same Wi-Fi network)

---

## 🧪 Testing with Multiple Students (Multi-Tab / Multi-Device)

Open multiple browser tabs or devices:

### Step 1: Open Teacher Tab
* Open [http://localhost:3000](http://localhost:3000) in **Tab 1**.
* Select **Teacher Portal**, enter your name (e.g., `Ms. Rao`), and click **Enter Teacher Dashboard**.
* You will see the session status as `Waiting for Teacher to Start`.

### Step 2: Open Student Tabs (No placeholders – fully dynamic)
* Open [http://localhost:3000](http://localhost:3000) in **Tab 2**:
  * Name: `Ravi`, Roll Number: `101` (Advocates for Telugu freedom in playground and mess).
* Open [http://localhost:3000](http://localhost:3000) in **Tab 3**:
  * Name: `Ananya`, Roll Number: `102` (Concerns about non-Telugu peers feeling excluded).
* Open [http://localhost:3000](http://localhost:3000) in **Tab 4**:
  * Name: `Karthik`, Roll Number: `103` (Proposes balanced compromise).
* Notice all student tabs display the **Waiting Room Overlay** with the scenario briefing until the teacher begins the session.

### Step 3: Start Discussion
* In the **Teacher Tab**, click **"▶ Start Discussion"**.
* Instantly, all student tabs unlock and transition to the active discussion workspace!

### Step 4: Test Dominance & Inclusivity Scaffolds
* Have Ravi send 2–3 substantive messages while Karthik remains silent.
* Check the **Teacher Dashboard**:
  * Ravi's card turns green with a high word percentage.
  * Karthik's card turns red (`Silent / Inactive`).
  * An AI Inclusivity card appears in the teacher's **AI Suggestions Queue**:
    `"🤖 Inclusivity Nudge: @Karthik, we would love to hear your thoughts! Do you feel speaking home languages like Telugu should be allowed during lunchtime in the mess or sports in the playground?..."`
* As the Teacher, click **"✓ Approve & Send to Class"** or **"✎ Edit"** to modify the prompt and broadcast it to the student chat!

### Step 5: Test Off-Topic Drift Flagging
* In any student tab, type:
  `"Did you watch the IPL cricket match yesterday? Who scored fifty?"`
* The message is sent, but instantly tagged with a `⚠️ Off-Topic Drift` badge, and an alert is delivered to the Teacher Dashboard.

### Step 6: Test Shared Artefact Co-Authoring & Ratification
* In any student tab, click **"+ Propose Amendment"**.
* Fill in:
  * **Proposed Clause:** *"Rule 4.1: English is mandatory inside the classroom during instructional hours. In the playground, dining mess, and corridors, students may speak Telugu or English, provided all peers are included respectfully."*
  * **Justification:** *"Balances English practice in class with emotional comfort and freedom outside class."*
* Click **Submit Proposal to Group**.
* Notice the amendment appears in real time on all student screens and the teacher dashboard.
* Have peers vote **"✓ Support Amendment"**.
* Once consensus is reached, the Classroom Constitution is formally ratified and updated with a celebratory announcement!

---

## 🛠️ Automated Simulation Test
An automated end-to-end integration test is included:
```bash
node test-simulation.js
```
This script connects 1 teacher and 3 student sockets, runs through discussion, off-topic detection, silence scaffolding, amendment proposal, and consensus ratification.

---

## ☁️ Deployment Guide (Vercel & Persistent Hosts)

### Option 1: Deploying to Vercel

1. **Push your repository to GitHub:**
   ```bash
   git add .
   git commit -m "feat: production ready Student Sabha"
   git push origin main
   ```

2. **Import into Vercel:**
   * Go to [vercel.com](https://vercel.com) and log in.
   * Click **"Add New Project"** and select your GitHub repository `et617-endsem-25m1027`.
   * Vercel will automatically detect `vercel.json`.

3. **Configure the Gemini API Key in Vercel:**
   * Under **Environment Variables**:
     * **Key:** `GEMINI_API_KEY`
     * **Value:** `your_actual_gemini_api_key`
   * Click **Deploy**.

> [!NOTE]
> **Understanding Vercel & WebSockets:** Vercel functions are serverless (stateless & short-lived). While single-instance requests work, multi-tab real-time WebSocket state across different serverless instances benefits from a persistent Node.js host.

---

### Option 2: 1-Click Free Persistent Hosting (Render / Railway) — Recommended for WebSockets

Because `Student Sabha` uses native WebSockets (`Socket.IO`) for instantaneous multi-device synchronization, deploying on a persistent Node host keeps the server running 24/7 without disconnects:

#### Deploy to Render (Free Tier):
1. Go to [render.com](https://render.com) and connect your GitHub repo.
2. Select **"Web Service"**.
3. Settings:
   * **Runtime:** Node
   * **Build Command:** `npm install`
   * **Start Command:** `npm start`
4. **Add Environment Variable:**
   * `GEMINI_API_KEY`: `your_gemini_api_key`
5. Click **Deploy**. Render will generate a live URL (e.g., `https://student-sabha.onrender.com`).

---

## 🔑 How to Get & Configure the Gemini API Key

1. **Obtain your API Key:**
   * Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
   * Click **"Create API Key"** and copy the key.

2. **For Local Development:**
   * Create a `.env` file in the project root:
     ```env
     GEMINI_API_KEY=AIzaSy...your_key_here
     ```
   * Or run in terminal:
     ```bash
     export GEMINI_API_KEY="your_key_here"
     npm start
     ```

3. **Built-in Fallback Reliability:**
   * If `GEMINI_API_KEY` is not provided or quota is exhausted, `Student Sabha` automatically falls back to its built-in smart pedagogical heuristic engine, ensuring 100% uptime with zero crashes.

