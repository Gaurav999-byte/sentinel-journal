# 🛡️ Sentinel Journal

### Secure Personal Gemini Journal with Firebase Authentication, Firestore, Gemini AI, and a Human-in-the-Loop Decision Engine

Sentinel Journal is a privacy-focused personal AI journal that allows authenticated users to reflect, think through problems, explore decisions, and maintain private conversations with Gemini.

The application combines conversational AI with user-isolated journal storage and a human-in-the-loop Decision & Action Engine that turns important conversations into structured, reviewable decision cards.

---

## 🎯 Problem

Personal AI conversations can contain highly sensitive thoughts, plans, problems, and decisions.

A useful AI journal should therefore provide:

- Secure user authentication
- Strong separation between users' data
- Persistent conversations
- Multi-turn AI interaction
- Structured decision support
- User control over what gets saved
- Protection against common authorization and secret-exposure risks

Sentinel Journal was designed around these principles.

---

## ✨ Key Features

### 🔐 Firebase Authentication

Users authenticate using Google Sign-In through Firebase Authentication.

The backend verifies the Firebase ID token before allowing protected operations.

The server uses the authenticated Firebase UID rather than trusting a UID supplied by the client.

### 🤖 Multi-turn Gemini Conversations

Users can have contextual conversations with Gemini about:

- Personal reflections
- Problems and challenges
- Plans
- Decisions
- Questions
- Goals

Conversation context is maintained across multiple turns.

### 🗄️ User-Isolated Firestore Storage

Journal sessions and decision data are stored using user-scoped Firestore paths.

The application follows an ownership model where authenticated users can access only their own data.

Firestore security rules are included in:

`firestore.rules`

### 🧠 Decision & Action Engine

Sentinel Journal's original feature is a human-in-the-loop Decision & Action Engine.

During a conversation, users can turn an important discussion into a structured Decision Card.

The card can contain:

- Decision/question
- Available options
- Pros and cons
- Trade-offs
- Risks
- Unknowns
- Recommended next action
- Unresolved questions
- Confidence/context where applicable

The AI-generated card is presented for user review before it is persisted.

The user explicitly approves the decision before saving it.

Decision lifecycle support includes:

`Draft → Approved → Done`

with the ability to reopen completed decisions.

This keeps the user in control instead of allowing the AI to silently create commitments.

### 🧩 Journal Actions

The application provides additional guided actions including:

- Identify Risks
- Clarify Values
- Compare Options
- Turn into Decision Card
- Formulate in Journal

### 📚 History and Session Persistence

Successful conversations are automatically persisted.

Users can:

- Start a new reflection
- View previous reflections
- Continue previous conversations
- Delete their own reflections

### 🛡️ Security-Oriented Backend

The backend includes security-focused protections such as:

- Firebase ID-token verification
- Server-authoritative user identity
- User ownership checks
- Firestore security rules
- Input validation/sanitization
- Helmet security headers
- Rate limiting
- Secure error handling
- No Gemini API key in frontend code

---

## 🏗️ Architecture

```text
┌──────────────────────────────┐
│        React Frontend        │
│                              │
│  Journal UI                  │
│  Firebase Authentication     │
│  Gemini conversation UI      │
│  Decision Cards              │
└──────────────┬───────────────┘
               │
               │ Firebase ID Token
               ▼
┌──────────────────────────────┐
│       Node.js Backend        │
│                              │
│  Token verification          │
│  Authorization               │
│  Gemini interaction          │
│  Firestore operations        │
│  Security middleware         │
└──────────────┬───────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌──────────────┐  ┌──────────────┐
│   Gemini AI  │  │  Firestore   │
│              │  │              │
│ Multi-turn   │  │ User-scoped  │
│ conversations│  │ journal data │
└──────────────┘  └──────────────┘
