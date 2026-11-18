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

## ☁️ Deployment to Vercel

To deploy this project to Vercel:
1. Since Vercel Serverless functions have ephemeral connections, real-time WebSocket state is best paired with a hosted WebSocket server (such as Railway, Render, or Heroku) or using a serverless real-time provider (like Pusher or Supabase Realtime).
2. For standalone Node hosting (Docker, Render, Railway, Fly.io, or VPS), this repository is ready out of the box with `npm start`.

