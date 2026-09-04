import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { initializeApp as initializeAdminApp, getApps as getAdminApps } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json';

dotenv.config();

// Initialize Firebase Admin SDK for server-side token verification and secure operations
const adminApp = getAdminApps().length === 0
  ? initializeAdminApp({ projectId: firebaseConfig.projectId })
  : getAdminApps()[0];

const adminAuth = getAdminAuth(adminApp);
const adminDb = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getAdminFirestore(adminApp, firebaseConfig.firestoreDatabaseId)
  : getAdminFirestore(adminApp);

const app = express();
const PORT = 3000;

// Security Headers Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  next();
});

app.use(express.json({ limit: '1mb' }));

// In-memory rate limiter to prevent abuse on AI endpoints
interface RateLimitRecord {
  count: number;
  resetTime: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();

function rateLimiter(maxRequests = 35, windowMs = 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (!record || now > record.resetTime) {
      rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      res.status(429).json({
        error: 'Too many requests. Please wait a moment before sending another message.'
      });
      return;
    }

    record.count++;
    next();
  };
}

// Clean up stale rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Authenticated User Interface
export interface AuthenticatedUser {
  uid: string;
  email?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// Firebase ID Token verification middleware using Firebase Admin SDK
async function authenticateFirebaseToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or malformed authorization token' });
    return;
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Empty token provided' });
    return;
  }

  try {
    // Verify token using Firebase Admin SDK (cryptographically validates Google cert signature & project claims)
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    if (!decodedToken.uid) {
      res.status(401).json({ error: 'Unauthorized: Missing user identifier in token' });
      return;
    }

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email
    };

    next();
  } catch (err: any) {
    console.error('[Firebase Auth Error]:', err.code, err.message);
    const code = err.code || '';
    if (code === 'auth/id-token-expired') {
      res.status(401).json({ error: 'Unauthorized: Firebase ID token expired. Please refresh session.' });
      return;
    }
    res.status(401).json({ 
      error: `Unauthorized: Token verification failed (${err.code || err.message || 'invalid_token'})` 
    });
  }
}

// Lazy Gemini client initialization
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured on the server');
    }
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
}

// Timeout wrapper for external API calls to prevent hanging requests
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`API request timed out after ${Math.round(ms / 1000)}s (${label})`));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/**
 * Robustly extracts usable reflection text from all supported @google/genai response structures
 * Safely checks response.text getter/methods, candidates parts, candidate direct texts, top-level parts, and nested objects.
 */
function extractGeminiText(response: any): string {
  if (!response) return '';

  // Direct string response
  if (typeof response === 'string' && response.trim()) {
    return response.trim();
  }

  // 1. Try SDK getter / property / method response.text
  try {
    if (typeof response.text === 'string' && response.text.trim()) {
      return response.text.trim();
    }
    if (typeof response.text === 'function') {
      const fnVal = response.text();
      if (typeof fnVal === 'string' && fnVal.trim()) {
        return fnVal.trim();
      }
    }
  } catch (getterErr) {
    console.warn('[Gemini Response Extraction] response.text threw:', getterErr);
  }

  // 2. Deep inspection across all candidates and parts
  if (Array.isArray(response?.candidates)) {
    for (const candidate of response.candidates) {
      if (!candidate) continue;

      // 2a. Content parts
      const parts = candidate.content?.parts;
      if (Array.isArray(parts) && parts.length > 0) {
        // Pass 1: standard non-thought text parts
        const nonThoughtTexts: string[] = [];
        for (const p of parts) {
          if (typeof p === 'string' && p.trim()) {
            nonThoughtTexts.push(p.trim());
          } else if (typeof p?.text === 'string' && p.text.trim() && !p?.thought) {
            nonThoughtTexts.push(p.text.trim());
          }
        }
        if (nonThoughtTexts.length > 0) {
          return nonThoughtTexts.join('\n\n');
        }

        // Pass 2: any text part including thought if non-thought was absent
        const anyTexts: string[] = [];
        for (const p of parts) {
          if (typeof p === 'string' && p.trim()) {
            anyTexts.push(p.trim());
          } else if (typeof p?.text === 'string' && p.text.trim()) {
            anyTexts.push(p.text.trim());
          }
        }
        if (anyTexts.length > 0) {
          return anyTexts.join('\n\n');
        }
      }

      // 2b. Direct text property on candidate
      if (typeof candidate.text === 'string' && candidate.text.trim()) {
        return candidate.text.trim();
      }
      if (typeof candidate.content === 'string' && candidate.content.trim()) {
        return candidate.content.trim();
      }
    }
  }

  // 3. Top-level content parts
  if (Array.isArray(response?.content?.parts)) {
    const textPieces = response.content.parts
      .map((p: any) => typeof p === 'string' ? p : p?.text)
      .filter((t: any) => typeof t === 'string' && t.trim())
      .map((t: string) => t.trim());
    if (textPieces.length > 0) {
      return textPieces.join('\n\n');
    }
  }

  // 4. Inspect direct property aliases
  const altKeys = ['reply', 'reflection', 'message', 'output', 'result'];
  for (const k of altKeys) {
    if (typeof response[k] === 'string' && response[k].trim()) {
      return response[k].trim();
    }
  }

  // 5. Nested wrapped response objects
  if (response.response) {
    const nested = extractGeminiText(response.response);
    if (nested) return nested;
  }
  if (response.data) {
    const nested = extractGeminiText(response.data);
    if (nested) return nested;
  }

  return '';
}

// API Routes
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    service: 'Sentinel Journal API', 
    timestamp: new Date().toISOString() 
  });
});

// Multi-turn Gemini reflection conversation
app.post(
  '/api/gemini/chat',
  rateLimiter(30, 60 * 1000),
  authenticateFirebaseToken,
  async (req: Request, res: Response) => {
    try {
      const { messages } = req.body;
      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'Bad Request: "messages" array is required.' });
        return;
      }

      // Build a strictly valid multi-turn contents sequence:
      // 1. Filter out messages with empty content
      // 2. Map 'assistant' to 'model' and ensure role is 'user' or 'model'
      // 3. Merge consecutive messages with the same role into a single message
      // 4. Ensure sequence starts with 'user' and ends with 'user'
      const rawSanitized: Array<{ role: 'user' | 'model'; text: string }> = [];
      for (const m of messages) {
        if (!m || typeof m !== 'object') continue;
        const role: 'user' | 'model' = (m.role === 'assistant' || m.role === 'model') ? 'model' : 'user';
        const text = typeof m.content === 'string' ? m.content.trim().slice(0, 4000) : '';
        if (text) {
          rawSanitized.push({ role, text });
        }
      }

      if (rawSanitized.length === 0) {
        res.status(400).json({ error: 'Bad Request: Message content cannot be empty.' });
        return;
      }

      // Merge consecutive messages with identical roles so Gemini receives strictly alternating turns
      const merged: Array<{ role: 'user' | 'model'; text: string }> = [];
      for (const msg of rawSanitized) {
        if (merged.length > 0 && merged[merged.length - 1].role === msg.role) {
          merged[merged.length - 1].text += `\n\n${msg.text}`;
        } else {
          merged.push({ ...msg });
        }
      }

      // Ensure the sequence starts with 'user' (Gemini requires conversation to start with a user turn)
      while (merged.length > 0 && merged[0].role !== 'user') {
        merged.shift();
      }

      // Slice the most recent conversation window (up to 20 turns)
      let sliced = merged.slice(-20);
      while (sliced.length > 0 && sliced[0].role !== 'user') {
        sliced.shift();
      }
      while (sliced.length > 0 && sliced[sliced.length - 1].role !== 'user') {
        sliced.pop();
      }

      if (sliced.length === 0) {
        const lastUser = rawSanitized.filter(m => m.role === 'user').pop();
        if (lastUser) {
          sliced = [lastUser];
        } else {
          res.status(400).json({ error: 'Bad Request: At least one user message is required.' });
          return;
        }
      }

      // Convert to Gemini API contents format
      const sanitizedMessages = sliced.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const ai = getGenAI();
      const systemInstruction = `You are Sentinel, a private, calm, and deeply perceptive reflection assistant inside Sentinel Journal.
Your purpose is to help the user unpack dilemmas, organize messy thoughts, clarify underlying priorities, evaluate trade-offs, and make sound decisions.

Behavioral Directives:
1. Tone: Warm, grounded, intellectually honest, and objective. Avoid sycophancy or generic motivational clichés.
2. Structure: Use clean formatting, clear paragraphs, and concise bullet points where appropriate.
3. Inquiries: Pose 1-2 focused, high-leverage clarifying questions to help the user uncover root desires or hidden risks.
4. Privacy & Boundaries: Never claim to access anyone else's private data or external databases. Strictly maintain user privacy.
5. Decision Readiness: When the user is deliberating between choices, help them map: (a) what matters most, (b) realistic trade-offs, and (c) key unknowns.`;

      // Models to try in sequence with appropriate timeout and thinking config
      // gemini-3.1-flash-lite is primary for speed and high availability, cascading to flash models
      const candidateModels = [
        { model: 'gemini-3.1-flash-lite', thinking: undefined, timeoutMs: 15000 },
        { model: 'gemini-3.8-flash', thinking: ThinkingLevel.LOW, timeoutMs: 12000 },
        { model: 'gemini-3.5-flash', thinking: ThinkingLevel.LOW, timeoutMs: 15000 }
      ];

      let response: any = null;
      let lastModelError: any = null;
      let reply = '';

      for (const item of candidateModels) {
        try {
          const config: any = {
            systemInstruction,
            temperature: 0.7,
          };
          if (item.thinking) {
            config.thinkingConfig = { thinkingLevel: item.thinking };
          }

          const resCandidate = await withTimeout(
            ai.models.generateContent({
              model: item.model,
              contents: sanitizedMessages,
              config,
            }),
            item.timeoutMs,
            item.model
          );

          const extracted = extractGeminiText(resCandidate);
          if (extracted) {
            response = resCandidate;
            reply = extracted;
            break;
          } else {
            console.warn(`[Gemini Chat] Model ${item.model} returned empty extracted text, trying next candidate...`);
            response = resCandidate;
          }
        } catch (mErr: any) {
          console.warn(`[Gemini Chat] Model ${item.model} failed:`, mErr?.message || mErr);
          lastModelError = mErr;
        }
      }

      // If Gemini genuinely returned no usable text, return a clear retryable error
      if (!reply) {
        const finishReason = response?.candidates?.[0]?.finishReason;
        const isSafety = finishReason === 'SAFETY' ||
                         lastModelError?.message?.includes('SAFETY') ||
                         lastModelError?.message?.includes('safety');
        
        const isRateLimit = lastModelError?.status === 'RESOURCE_EXHAUSTED' ||
                            lastModelError?.code === 429 ||
                            lastModelError?.message?.includes('429') ||
                            lastModelError?.message?.includes('quota') ||
                            lastModelError?.message?.includes('Quota exceeded') ||
                            lastModelError?.message?.includes('rate limit');

        const isDemandSpike = lastModelError?.message?.includes('high demand') || 
                              lastModelError?.status === 'UNAVAILABLE' ||
                              lastModelError?.message?.includes('503');

        const isTimeout = lastModelError?.message?.includes('timed out') ||
                          lastModelError?.name === 'AbortError' ||
                          lastModelError?.code === 'ETIMEDOUT';

        const isNetworkFailure = lastModelError?.code === 'ENOTFOUND' ||
                                 lastModelError?.code === 'ECONNRESET' ||
                                 lastModelError?.code === 'ECONNREFUSED' ||
                                 lastModelError?.message?.includes('fetch failed');

        let errorMsg = 'Sentinel returned an empty reflection. Please try rephrasing or click Retry.';
        let statusCode = 502;

        if (isSafety) {
          errorMsg = 'Sentinel was unable to generate a reflection due to content safety filters. Please rephrase your thoughts.';
          statusCode = 400;
        } else if (isRateLimit) {
          errorMsg = 'Sentinel reflection rate limit reached. Please wait a moment and click Retry.';
          statusCode = 429;
        } else if (isDemandSpike) {
          errorMsg = 'Sentinel reflection engine is currently experiencing high demand. Please retry in a moment.';
          statusCode = 503;
        } else if (isTimeout) {
          errorMsg = 'Sentinel reflection request timed out. Please click Retry.';
          statusCode = 504;
        } else if (isNetworkFailure) {
          errorMsg = 'Unable to reach the Sentinel reflection service. Please check your network connection and retry.';
          statusCode = 502;
        }

        res.status(statusCode).json({ error: errorMsg });
        return;
      }

      res.json({
        reply,
        text: reply,
        reflection: reply,
        content: reply
      });
    } catch (error: any) {
      console.error('[Gemini Chat Error]:', error);
      const isTimeout = error?.message?.includes('timed out') || error?.code === 'ETIMEDOUT';
      const isRateLimit = error?.status === 'RESOURCE_EXHAUSTED' || error?.message?.includes('429') || error?.message?.includes('quota');
      const isDemandSpike = error?.status === 'UNAVAILABLE' || error?.message?.includes('503') || error?.message?.includes('high demand');
      const isSafety = error?.message?.includes('SAFETY') || error?.message?.includes('safety');
      const isNetwork = error?.code === 'ENOTFOUND' || error?.code === 'ECONNRESET' || error?.message?.includes('fetch failed');
      
      let statusCode = 500;
      let errorMsg = error?.message || 'Sentinel was unable to process your reflection at this time. Please try again.';
      if (isTimeout) {
        statusCode = 504;
        errorMsg = 'Sentinel reflection request timed out. Please click Retry.';
      } else if (isRateLimit) {
        statusCode = 429;
        errorMsg = 'Sentinel reflection rate limit reached. Please wait a moment and click Retry.';
      } else if (isDemandSpike) {
        statusCode = 503;
        errorMsg = 'Sentinel reflection engine is currently experiencing high demand. Please retry in a moment.';
      } else if (isSafety) {
        statusCode = 400;
        errorMsg = 'Sentinel was unable to generate a reflection due to content safety filters. Please rephrase your thoughts.';
      } else if (isNetwork) {
        statusCode = 502;
        errorMsg = 'Unable to reach the Sentinel reflection service. Please check your network connection and retry.';
      }
      res.status(statusCode).json({ error: errorMsg });
    }
  }
);

// Turn conversation into structured DRAFT Decision Card
app.post(
  '/api/gemini/decision',
  rateLimiter(20, 60 * 1000),
  authenticateFirebaseToken,
  async (req: Request, res: Response) => {
    try {
      const { messages } = req.body;
      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'Bad Request: Conversation history is required to generate a decision card.' });
        return;
      }

      // Format conversation text for analysis
      const conversationTranscript = messages
        .slice(-25)
        .map((m: any) => `${m.role === 'user' ? 'User' : 'Sentinel'}: ${m.content || ''}`)
        .join('\n\n');

      const ai = getGenAI();

      const decisionPrompt = `Analyze the following reflection conversation transcript and distill it into a structured, executive-level Decision Card.
The output MUST be a factual, balanced synthesis of the choices, values, trade-offs, and risks discussed.

Transcript:
"""
${conversationTranscript.slice(0, 10000)}
"""

Extract and formulate:
- decision: The core dilemma or question to be decided (e.g., "Should I transition to the new startup role or remain in my current corporate position?")
- options: 2 to 4 distinct options or paths being considered
- whatMatters: 3 to 5 core values or criteria that are pivotal (e.g., "Autonomy", "Compensation", "Work-life balance", "Career trajectory")
- pros: 2 to 4 key advantages, positive merits, or strengths across the options
- cons: 2 to 4 key drawbacks, downsides, or potential regrets across the options
- tradeOffs: 2 to 4 sharp trade-offs between the choices (e.g., "Higher equity upside vs predictable stability")
- risks: 2 to 4 notable risks, blindspots, or hidden assumptions
- nextAction: 1 specific, immediate, actionable next step to move clarity forward
- deadline: Optional target timeline or date if mentioned, otherwise leave as an empty string ""
- unresolvedQuestions: 2 to 3 critical questions that remain unanswered before making the final call
- confidence: "Low", "Medium", or "High" reflecting how well-developed and clear the facts and options are right now.`;

      const decisionConfig = {
        systemInstruction: 'You are an executive strategic decision analyst. You convert personal and professional reflections into structured, zero-fluff Decision Cards.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            decision: { type: Type.STRING },
            options: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            whatMatters: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            pros: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            cons: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            tradeOffs: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            risks: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            nextAction: { type: Type.STRING },
            deadline: { type: Type.STRING },
            unresolvedQuestions: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            confidence: { 
              type: Type.STRING,
              enum: ['Low', 'Medium', 'High']
            }
          },
          required: [
            'decision',
            'options',
            'whatMatters',
            'pros',
            'cons',
            'tradeOffs',
            'risks',
            'nextAction',
            'unresolvedQuestions',
            'confidence'
          ]
        }
      };

      const decisionModels = [
        { model: 'gemini-3.1-flash-lite', timeoutMs: 15000 },
        { model: 'gemini-3.5-flash', timeoutMs: 18000 }
      ];

      let response: any = null;
      let lastDecisionError: any = null;

      for (const item of decisionModels) {
        try {
          response = await withTimeout(
            ai.models.generateContent({
              model: item.model,
              contents: [{ role: 'user', parts: [{ text: decisionPrompt }] }],
              config: decisionConfig
            }),
            item.timeoutMs,
            item.model
          );

          if (response?.text) {
            break;
          }
        } catch (dErr: any) {
          console.warn(`[Gemini Decision] Model ${item.model} failed:`, dErr?.message || dErr);
          lastDecisionError = dErr;
        }
      }

      if (!response?.text) {
        throw lastDecisionError || new Error('Unable to synthesize decision card from conversation.');
      }

      const responseText = response.text || '{}';
      const parsed = JSON.parse(responseText);
      const draft = {
        decision: typeof parsed.decision === 'string' ? parsed.decision : 'Decision Required',
        options: Array.isArray(parsed.options) ? parsed.options : [],
        whatMatters: Array.isArray(parsed.whatMatters) ? parsed.whatMatters : [],
        pros: Array.isArray(parsed.pros) ? parsed.pros : [],
        cons: Array.isArray(parsed.cons) ? parsed.cons : [],
        tradeOffs: Array.isArray(parsed.tradeOffs) ? parsed.tradeOffs : [],
        risks: Array.isArray(parsed.risks) ? parsed.risks : [],
        nextAction: typeof parsed.nextAction === 'string' ? parsed.nextAction : '',
        deadline: typeof parsed.deadline === 'string' ? parsed.deadline : '',
        unresolvedQuestions: Array.isArray(parsed.unresolvedQuestions) ? parsed.unresolvedQuestions : [],
        confidence: ['Low', 'Medium', 'High'].includes(parsed.confidence) ? parsed.confidence : 'Medium',
      };

      // Note: We return ONLY the draft. The AI does NOT automatically persist to Firestore.
      res.json({ draft });
    } catch (error: any) {
      console.error('[Gemini Decision Synthesis Error]:', error);
      res.status(500).json({ 
        error: error?.message || 'Unable to formulate a decision card from this conversation. Please ensure the dialogue contains sufficient decision context.' 
      });
    }
  }
);

// Securely delete a specific user reflection session
app.delete(
  '/api/entries/:id',
  authenticateFirebaseToken,
  async (req: Request, res: Response) => {
    try {
      const entryId = req.params.id;
      if (!entryId || typeof entryId !== 'string' || entryId.trim().length === 0) {
        res.status(400).json({ error: 'Bad Request: Entry ID is required.' });
        return;
      }

      // UID is derived exclusively from the verified Firebase ID token - never client provided
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: 'Unauthorized: User identifier missing from verified token.' });
        return;
      }

      const cleanEntryId = entryId.trim();
      // Ensure entryId contains only valid characters to prevent path manipulation
      if (!/^[a-zA-Z0-9_\-]+$/.test(cleanEntryId)) {
        res.status(400).json({ error: 'Bad Request: Invalid Entry ID format.' });
        return;
      }

      const documentPath = `users/${uid}/entries/${cleanEntryId}`;

      // 1. Attempt server-side deletion using Admin Firestore SDK
      let deletedViaAdmin = false;
      try {
        const docRef = adminDb.doc(documentPath);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
          // Idempotent success if already deleted or doesn't exist
          res.json({ success: true, message: 'Reflection entry deleted or already removed.' });
          return;
        }

        // Enforce ownership: document is strictly inside users/{uid}/entries/{entryId} and check userId field
        const data = docSnap.data();
        if (data?.userId && data.userId !== uid) {
          res.status(403).json({ error: 'Forbidden: You do not have permission to delete this reflection.' });
          return;
        }

        // Delete ONLY the selected reflection document
        await docRef.delete();
        deletedViaAdmin = true;
      } catch (adminErr: any) {
        // In containerized sandboxes without direct GCP IAM role on the target project,
        // Admin SDK gRPC returns "7 PERMISSION_DENIED: Missing or insufficient permissions."
        // Fall back to executing deletion using the verified Firebase Bearer token via the Firestore REST API
        console.warn('[Admin Firestore] Direct Admin SDK operation could not complete, attempting authenticated REST delete:', adminErr?.message || adminErr);
      }

      if (deletedViaAdmin) {
        res.json({ success: true, message: 'Reflection entry deleted successfully.' });
        return;
      }

      // 2. Perform authenticated deletion using the user's verified Firebase Bearer token via Firestore REST API
      const authHeader = req.headers.authorization;
      const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${databaseId}/documents/users/${encodeURIComponent(uid)}/entries/${encodeURIComponent(cleanEntryId)}`;

      const restResponse = await fetch(firestoreUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': authHeader!
        }
      });

      if (!restResponse.ok) {
        const errorData = (await restResponse.json().catch(() => ({}))) as any;
        console.error('[Firestore REST Delete Error]:', restResponse.status, errorData);

        if (restResponse.status === 403 || restResponse.status === 401) {
          res.status(403).json({
            error: errorData?.error?.message || 'Permission denied: You do not have permission to delete this reflection.'
          });
          return;
        }

        if (restResponse.status === 404) {
          // Document already doesn't exist, idempotent success
          res.json({ success: true, message: 'Reflection entry already removed.' });
          return;
        }

        res.status(restResponse.status).json({
          error: errorData?.error?.message || 'Failed to delete reflection from Firestore.'
        });
        return;
      }

      res.json({ success: true, message: 'Reflection entry deleted successfully.' });
    } catch (error: any) {
      console.error('[Delete Reflection Error]:', error);
      res.status(500).json({
        error: error?.message || 'Failed to delete reflection entry.'
      });
    }
  }
);

// Securely delete a specific user decision card
app.delete(
  '/api/decisions/:id',
  authenticateFirebaseToken,
  async (req: Request, res: Response) => {
    try {
      const decisionId = req.params.id;
      if (!decisionId || typeof decisionId !== 'string' || decisionId.trim().length === 0) {
        res.status(400).json({ error: 'Bad Request: Decision Card ID is required.' });
        return;
      }

      // UID is derived exclusively from the verified Firebase ID token - never client provided
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: 'Unauthorized: User identifier missing from verified token.' });
        return;
      }

      const cleanDecisionId = decisionId.trim();
      // Ensure decisionId contains only valid characters to prevent path manipulation
      if (!/^[a-zA-Z0-9_\-]+$/.test(cleanDecisionId)) {
        res.status(400).json({ error: 'Bad Request: Invalid Decision Card ID format.' });
        return;
      }

      const documentPath = `users/${uid}/decisions/${cleanDecisionId}`;

      // 1. Attempt server-side deletion using Admin Firestore SDK
      let deletedViaAdmin = false;
      try {
        const docRef = adminDb.doc(documentPath);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
          // Idempotent success if already deleted or doesn't exist
          res.json({ success: true, message: 'Decision card deleted or already removed.' });
          return;
        }

        // Enforce ownership: document is strictly inside users/{uid}/decisions/{decisionId} and check userId field
        const data = docSnap.data();
        if (data?.userId && data.userId !== uid) {
          res.status(403).json({ error: 'Forbidden: You do not have permission to delete this decision card.' });
          return;
        }

        // Delete ONLY the selected decision card document
        await docRef.delete();
        deletedViaAdmin = true;
      } catch (adminErr: any) {
        console.warn('[Admin Firestore] Direct Admin SDK operation could not complete, attempting authenticated REST delete:', adminErr?.message || adminErr);
      }

      if (deletedViaAdmin) {
        res.json({ success: true, message: 'Decision card deleted successfully.' });
        return;
      }

      // 2. Perform authenticated deletion using the user's verified Firebase Bearer token via Firestore REST API
      const authHeader = req.headers.authorization;
      const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${databaseId}/documents/users/${encodeURIComponent(uid)}/decisions/${encodeURIComponent(cleanDecisionId)}`;

      const restResponse = await fetch(firestoreUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': authHeader!
        }
      });

      if (!restResponse.ok) {
        const errorData = (await restResponse.json().catch(() => ({}))) as any;
        console.error('[Firestore REST Delete Decision Error]:', restResponse.status, errorData);

        if (restResponse.status === 403 || restResponse.status === 401) {
          res.status(403).json({
            error: errorData?.error?.message || 'Permission denied: You do not have permission to delete this decision card.'
          });
          return;
        }

        if (restResponse.status === 404) {
          // Document already doesn't exist, idempotent success
          res.json({ success: true, message: 'Decision card already removed.' });
          return;
        }

        res.status(restResponse.status).json({
          error: errorData?.error?.message || 'Failed to delete decision card from Firestore.'
        });
        return;
      }

      res.json({ success: true, message: 'Decision card deleted successfully.' });
    } catch (error: any) {
      console.error('[Delete Decision Error]:', error);
      res.status(500).json({
        error: error?.message || 'Failed to delete decision card.'
      });
    }
  }
);

async function startServer() {
  // Integrate Vite for development, or serve static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sentinel Journal server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
