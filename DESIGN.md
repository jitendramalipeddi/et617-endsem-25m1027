# Collaborative Problem-Solving Web Application: Design & Specification

**Course/Context:** ET617 – Educational Technology & Learning Sciences  
**Application Focus:** Computer-Supported Collaborative Learning (CSCL), Group Learning, Shared Representations  
**Target Scenario:** Drafting a Classroom Constitution (Language Policy Amendment: Classroom vs. School Premises)  
**Target Learner Profile:** Learners whose home language differs from the school medium (Telugu home language, English medium school)

---

## 1. Executive Summary & Problem Framing

### 1.1 The Core Problem
Traditional group work often suffers from two ubiquitous failure modes:
1. **The Free-Rider Effect / Intellectual Dominance:** One assertive student dominates the task and drafts the final output, while passive students disengage or offer only superficial compliance ("looks good to me", "+1").
2. **Unguided Disputation or Premature Consensus:** Students either argue without grounding reasons (disputational talk) or rush to agree without critically evaluating trade-offs (cumulative talk) rather than engaging in **exploratory talk**.

This web application is a pedagogical platform designed for collaborative problem-solving. It scaffolds small groups of learners (3+ students) through a structured inquiry task: co-authoring a shared artefact (a clause in their Classroom Constitution), debating differing perspectives, resolving disagreements through reasoned argumentation, and reaching genuine consensus.

### 1.2 Scenario: The Language Policy Amendment
* **Constitutional Clause under Debate:** *Article IV, Section 2: "Language of Communication"*.
* **Current Strict Rule:** *"All students must speak exclusively in English at all times across all school premises, including classrooms, corridors, sports field, dining hall/mess, and bus."*
* **Proposed Amendment Task:** Students must collaborate to deliberate and revise this rule so that English practice is fostered within instructional settings (the classroom) while respecting students' linguistic rights, emotional comfort, and social connection in non-instructional school premises (playground, mess, common areas) where speaking home languages (e.g., Telugu) is currently penalized.
* **Learner Context Considerations:**
  * Telugu-dominant learners may experience cognitive overload, expressive anxiety, or feeling silenced when forced to deliberate strictly in an L2 (English).
  * The tool must accommodate bilingual scaffolding, acknowledge translanguaging (code-switching) as a legitimate cognitive stepping stone, and encourage articulate explanation without linguistic penalization.

---

## 2. Pedagogical Grounding (CSCL Foundations)

| CSCL Pillar | Theoretical Basis | Application Feature Implementation |
| :--- | :--- | :--- |
| **Shared Representations** | External cognition (Scardamalia & Bereiter; Suthers, 2006). A shared artefact anchors group grounding and prevents ephemeral verbal drift. | **Live Shared Constitution Editor:** Real-time synchronized clause document. Chat arguments are directly anchored to proposed text changes. |
| **Explanation of Decisions** | Exploratory Talk (Mercer, 2000; Chi's ICAP Framework - Interactive learning). Learners must make warrants and evidence explicit. | **Epistemic Argument Scaffolds:** Sentence starters ("I propose this change because...", "An unintended consequence might be...") and AI prompting asking "Why?". |
| **Peer Feedback & Disagreement Resolution** | Constructive Controversy (Johnson & Johnson, 2009); Socio-cognitive conflict (Doise & Mugny). Disagreements prompt cognitive restructuring. | **Disagreement Resolution Protocol:** Explicit voting with justification requirement; counter-proposal mechanisms before a clause can be ratified. |
| **Participation Parity & Equity** | Co-construction of knowledge (Vygotsky's ZPD); Transactive Discourse (Berkowitz & Gibbs). | **Inclusivity & Balance Engine:** Measures talk-time skew, transactive responsiveness, and prompts quieter voices while nudging dominant peers. |

---

## 3. Addressing the Design Challenge: Meaningful Collaboration vs. One-Sided Work

### 3.1 What Signals Differentiate Real Collaboration from Free-Riding?
The application continuously monitors multiple behavioural and semantic signals rather than just raw message counts:

| Signal Category | Indicator Metric | Meaningful Collaboration | One-Sided / Free-Rider Failure |
| :--- | :--- | :--- | :--- |
| **1. Volume & Turn-Taking Distribution** | Gini coefficient of word count and turn frequency across learners. | Balanced participation curve ($Gini < 0.35$). All students contribute substantive paragraphs. | Extreme skew ($Gini > 0.65$); 1 student contributes >70% of words; others post ≤ 1–2 word replies. |
| **2. Epistemic Contribution Novelty** | Semantic diversity and novel vocabulary introduction per message. | Each participant introduces new claims, warrants, counter-examples, or alternatives. | Passive repetition ("yes", "agreed", "same here", "done") or silent presence without inputs. |
| **3. Transactive Discourse Markers** | Frequency of cross-referencing peers (e.g., *"Building on Ravi's point..."*, *"Unlike Ananya, I think..."*). | High transactivity: students quote, synthesize, question, or challenge each other's specific claims. | Parallel monologue: Student A writes a full proposal; Students B & C make unconnected side comments. |
| **4. Shared Artefact Interaction** | Edit logs, diff attribution, revision proposals, and justification logs on the Constitution text. | Distributed editing: One proposes a draft, another refines vocabulary, a third adds exceptions/provisos. | Single-author commit: 1 student types the entire document; others simply click "Accept" without edits. |
| **5. Response Latency & Active Silence** | Time between peer questions and subsequent responses; idle duration during debate phases. | Responsive turn cadence (15s–60s) reflecting active reading and reflection. | Prolonged idle dropout (>90s inactivity while active discussion unfolds). |

### 3.2 System Response when Collaboration is One-Sided

```
                                [Inclusivity Engine]
                                         │
                    ┌────────────────────┴────────────────────┐
           [Skew / Free-riding Detected]            [Off-topic Drift Detected]
                    │                                         │
       ┌────────────┴────────────┐                            │
       ▼                         ▼                            ▼
[Scaffold Dominant Student]  [Scaffold Quiet Student]   [Alert Teacher Dashboard]
"Great insight! Let's pause  "Ravi, what do you think   "Group 1 is off-topic:
to see how Sita responds to   about clause 4.2's impact  discussing weekend plans.
your mess-area clause."      on students eating lunch?"  Approve intervention?"
```

1. **Gentle Dominance Pacing (Nudge to Dominant Learner):**
   * *Feedback Prompt:* *"You have articulated some strong arguments! Before drafting the next clause, ask your teammates what potential challenges they foresee with this compromise."*
   * *Temporary Input Pacing:* Encourages the dominant student to act as an interviewer or facilitator rather than sole scribe.
2. **Targeted Epistemic Scaffolding (Invite Quiet Learner):**
   * *Personalized Prompt:* The AI mentions the quiet learner by name and refers directly to a prior point or a relevant perspective: *"Karthik, how would this English-only restriction in the playground affect students who want to relax after a difficult math test?"*
3. **Role Rotation Scaffolding:**
   * If one student dominates writing the artefact, the system prompts: *"It is time for peer review. Scribe duty rotates to Ananya. Ravi and Karthik will now provide critiques."*
4. **Teacher-in-the-Loop Flag:**
   * An urgent intervention badge pops up on the Teacher Dashboard: *"Participation alert: Ravi (78% talk-time), Sita (14%), Karthik (8%). Sita has not spoken for 3 minutes."* The teacher can send an instant targeted nudge or trigger an AI prompt.

---

## 4. Design Constraint: Teacher-in-the-Loop (TITL) Architecture

The application implements a strict **Teacher-in-the-Loop** model. AI is not an unchecked authority; it acts as an intelligent teaching assistant that advises the human instructor.

### 4.1 Teacher Capabilities
1. **Session Gatekeeper ("Start Discussion"):**
   * Students who join are kept in a *Waiting Room* with the prompt background and constitution guidelines.
   * The chat and shared document editing only unlock when the teacher clicks **"Start Discussion"**.
2. **Real-Time Participation & Inclusivity Dashboard:**
   * Visual distribution of talk-time (message count, word count, character count).
   * Status indicators for every student: `Active`, `Hesitant/Slow`, `Silent/Inactive`.
   * Live transactivity score (indicates whether they are talking *to* each other or *past* each other).
3. **AI Suggestion Staging & Approval Queue:**
   * When the AI system synthesizes a facilitation prompt or detects a drift, it generates an **Intervention Card** on the teacher's dashboard.
   * The teacher can:
     * **[Approve & Send]:** Delivers the prompt into the student chat stream immediately.
     * **[Edit & Send]:** Lets the teacher refine or rephrase the AI prompt before delivering it.
     * **[Dismiss / Override]:** Cancels the AI suggestion if the teacher feels students are working it out themselves.
     * **[Direct Teacher Broadcast]:** The teacher can inject a custom teacher message anytime, badged with high pedagogical priority.
4. **Safety & Off-Topic Alert Feed:**
   * If students deviate from the constitution topic (e.g., chatting about games, school gossip, or toxic language), the AI flags the message and alerts the teacher with an immediate review banner.

---

## 5. User Personas & Sample Scenarios

### 5.1 Student Personas for Local 3-Student Testing

| Persona Name | Profile & Linguistic Background | Role in the Debate |
| :--- | :--- | :--- |
| **Student 1: Ravi (Roll 101)** | Home language: Telugu. ESL learner. Finds speaking English during sports and lunch unnatural and exhausting. | Advocates strongly for speaking Telugu in the playground, dining hall, and corridors; argues that forced English outside class causes alienation and silence. |
| **Student 2: Ananya (Roll 102)** | Fluent English speaker. Believes school is the only place to build professional English proficiency. | Expresses concern that if students speak Telugu in the mess, non-Telugu students will feel excluded, and students won't practice English. |
| **Student 3: Karthik (Roll 103)** | Quiet / Reflective learner. Moderate English skills. Prefers clear rules and fairness. | Proposes a compromise: keep classroom instruction in English, but allow all Indian regional languages in informal spaces with an anti-exclusion clause. |

---

## 6. System Architecture & Technical Stack

### 6.1 Technical Stack Choice
* **Runtime:** Node.js (v18+)
* **Server Framework:** Express.js + Native WebSockets (`ws` or `socket.io`)
* **Client Architecture:** Modern, clean Vanilla HTML5/CSS3/ES6 JavaScript (Single-Page Component Architecture) – zero build-step overhead for seamless local execution, immediate live reloading, and multi-tab testing without bundling bottlenecks.
* **Real-time Protocol:** WebSockets for bidirectional event streaming (chat events, document operational diffs, participation telemetry, AI prompt queues).
* **AI Engine:**
  * **Built-in Smart Heuristic & Pattern Engine:** Built-in semantic parser detecting word count skew, inactivity, question patterns, epistemic markers, and off-topic keywords (guarantees 100% instant local testability with zero API keys required).
  * **LLM Integration Hook:** Optional plug-in interface for Gemini API / OpenAI API if configured via environment variables.
* **Deployment Readiness:** Designed to run via `npm start` locally and deployable to Vercel (via Next/Vercel serverless functions with Pusher/SSE or standalone container/Node host).

### 6.2 Data Model & State Schema

```typescript
// Core Data Structures

interface User {
  id: string;
  name: string;
  rollNo?: string;
  role: 'student' | 'teacher';
  status: 'active' | 'hesitant' | 'silent';
  wordCount: number;
  messageCount: number;
  lastActiveTimestamp: number;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'student' | 'teacher' | 'ai';
  content: string;
  timestamp: number;
  epistemicType: 'claim' | 'warrant' | 'counter-claim' | 'clarification' | 'agreement' | 'off-topic';
  flaggedOffTopic: boolean;
  transactiveTarget?: string; // name of peer being referenced
}

interface SharedArtefact {
  title: string;
  currentClauseText: string;
  version: number;
  lastModifiedBy: string;
  revisionHistory: {
    version: number;
    proposedBy: string;
    text: string;
    justification: string;
    timestamp: number;
    votes: Record<string, boolean>; // userId -> true/false
    status: 'draft' | 'proposed' | 'accepted' | 'rejected';
  }[];
}

interface AIPromptProposal {
  id: string;
  targetGroup: string;
  targetStudentId?: string;
  suggestedPrompt: string;
  pedagogicalRationale: string;
  type: 'inclusivity_nudge' | 'epistemic_deepener' | 'disagreement_resolution' | 'off_topic_warning';
  status: 'pending_teacher_approval' | 'approved' | 'rejected' | 'modified';
  timestamp: number;
}
```

---

## 7. User Interface & Screen Wireframes

### 7.1 Screen 1: Role Selection & Authentication
* Simple clean landing page:
  * Select role: **"Join as Teacher"** vs **"Join as Student"**.
  * Student form: Full Name + Roll Number (e.g., "Ravi", "101").
  * Teacher form: Teacher Name / Passcode (pre-filled or arbitrary for demo).
  * Direct "Quick Demo" buttons to launch:
    * `[Open Teacher Tab]`
    * `[Open Student: Ravi]`
    * `[Open Student: Ananya]`
    * `[Open Student: Karthik]`

### 7.2 Screen 2: Teacher Orchestration & Inclusivity Dashboard
* **Header:** Session Status (`WAITING FOR START` / `LIVE IN SESSION`), Timer, Action Button: `[▶ Start Discussion]` / `[⏸ Pause Session]`.
* **Left Column (Live Analytics & Inclusivity Metrics):**
  * **Participation Skew Meter:** Visual progress bars comparing word share per student.
  * **Student Cards:**
    * Ravi: 142 words (48%) | Status: `Active`
    * Ananya: 110 words (37%) | Status: `Active`
    * Karthik: 42 words (14%) | Status: `Hesitant / Low Output` (highlighted)
  * **Disagreement & Consensus Meter:** Shows agreement level on the active constitution clause.
* **Center Column (Live Class Discourse Feed):**
  * Real-time stream of all student chat messages with tags (`[Warrant]`, `[Rebuttal]`, `[Off-topic alert]`).
* **Right Column (AI Interventions & Teacher-in-the-Loop Controls):**
  * **Pending AI Interventions Queue:**
    * *Card:* "Quiet Student Alert: Karthik has contributed <15% of words in the last 4 minutes."
    * *Suggested AI Message:* *"Karthik, what is your view on Ananya's concern about non-Telugu speakers feeling left out?"*
    * Buttons: `[✓ Approve & Post]`, `[✎ Edit Prompt]`, `[✕ Reject]`.
  * **Direct Teacher Intervene Box:** Quick text box to post an authoritative teacher guidance message into the chat.

### 7.3 Screen 3: Student Collaborative Workspace
* **State 1 (Waiting Room):**
  * Displays: *"The teacher will start the discussion shortly. Review the task below."*
  * Briefing card on Article IV (Language Policy) and discussion goals.
* **State 2 (Active Discussion - 2 Column Split View):**
  * **Left Column: Group Deliberation Chat**
    * Message list with clear distinction between peers, Teacher announcements, and AI Facilitator prompts.
    * Input box with **Sentence Starter helpers** (e.g., *"I agree with... because..."*, *"In my experience as a Telugu speaker..."*, *"To make sure everyone feels included, we could..."*).
    * Quote/Reply button to explicitly foster transactive peer engagement.
  * **Right Column: Co-Authoring Shared Artefact (Classroom Constitution)**
    * Original clause text vs Current live draft.
    * **"Propose Amendment"** button: Opens editor modal where students write the new text + required field: *"Reason/Justification for this change"*.
    * **Voting / Consensus panel:** Once an amendment is proposed, all peers must review the rationale and click `[Support]` or `[Suggest Revision]`.

---

## 8. Multi-Tab Testing & Verification Plan

### Test Procedure (Simulating in 4 Browser Tabs)
1. **Tab 1 - Teacher:** Login as Teacher. Review the session view. Note that students are locked in the waiting state.
2. **Tab 2 - Student 1 (Ravi, Roll 101):** Joins room. Sees waiting room.
3. **Tab 3 - Student 2 (Ananya, Roll 102):** Joins room.
4. **Tab 4 - Student 3 (Karthik, Roll 103):** Joins room.
5. **Session Initiation:** Teacher clicks **"Start Discussion"**. All 3 student tabs instantly unlock with a notification chime.
6. **Interaction Test Case A (Epistemic Argumentation):**
   * Ravi posts: *"I think speaking Telugu in the playground should be allowed. It is our mother tongue and we feel tired after 6 hours of English classes."*
   * Ananya replies: *"I understand Ravi, but what if new students from other states who don't know Telugu are in our group? They will feel isolated."*
   * Teacher dashboard immediately updates word counts and categorizes claims.
7. **Interaction Test Case B (One-Sided Dominance & Inclusivity Trigger):**
   * Ravi and Ananya exchange multiple fast messages while Karthik remains silent.
   * System detects Karthik's silence (>60s inactivity + word skew).
   * Teacher Dashboard displays: *"AI Suggestion: Invite Karthik to weigh in on lunch area rules."*
   * Teacher clicks `[Approve & Post]`. The prompt instantly appears in the student chat: *"@Karthik, how do you think we can balance Ravi's comfort with Ananya's concern about inclusion?"*
8. **Interaction Test Case C (Off-Topic Detection):**
   * A student types: *"Did you watch the IPL cricket match yesterday? Who scored fifty?"*
   * System flags the message. Teacher gets an alert: *"Potential off-topic drift detected from Student 1"*.
   * Teacher overrides or sends a gentle redirect.
9. **Interaction Test Case D (Shared Artefact Co-Drafting):**
   * Karthik clicks **"Propose Amendment"** and writes:
     * *Revised Rule:* *"English is mandatory during classroom teaching and academic presentations. During lunch, sports, and breaks, students may speak their home languages, provided group activities remain welcoming to all."*
     * *Justification:* *"Balances English learning goals with emotional relaxation and prevents exclusion."*
   * Ravi and Ananya vote to accept. The live constitution updates for all participants and the teacher.

---

## 9. Implementation Milestones

1. **Phase 1: Project Setup & Real-time Server Core**
   * Node.js server with Express and WebSocket/Socket.io.
   * Session manager for Teacher and Student connections.
   * State store for chat messages, metrics, artefact revisions, and intervention queue.
2. **Phase 2: Teacher Dashboard Implementation**
   * Real-time metrics visualization (talk-time bars, participation status).
   * Session controller ("Start Discussion" / "Pause").
   * Teacher-in-the-Loop AI suggestion approval/modification workflow.
3. **Phase 3: Student Collaborative View & Shared Artefact**
   * Responsive chat room with quick-argument scaffolding.
   * Interactive shared constitution editor with revision proposing and consensus voting.
4. **Phase 4: AI Facilitator & Inclusivity Analytics Engine**
   * Real-time calculation of participation parity (Gini/skew).
   * Inactivity and dominance detection triggers.
   * Semantic/keyword off-topic flagging.
   * Context-aware prompt generation for linguistic inclusion (Telugu/English context).
5. **Phase 5: Local Testing, Polish & Multi-tab Verification**
   * Quick-launch buttons to open teacher and 3 student profiles effortlessly.
   * Clean styling with distinct visual identities for Teacher, Students, and AI.
   * Preparation for seamless Vercel deployment.
