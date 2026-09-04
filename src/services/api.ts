import { getCurrentIdToken } from '../lib/firebase';
import type { ChatMessage, DecisionCardDraft } from '../types';

async function fetchWithAuth(url: string, body?: Record<string, any>, method: string = 'POST'): Promise<any> {
  let token = await getCurrentIdToken(false);
  if (!token) {
    throw new Error('You must be signed in to perform this action.');
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`
  };
  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (netErr: any) {
    throw new Error('Network connection failed. Please check your internet connection and retry.');
  }

  // If unauthorized due to token expiration, try refreshing the token once
  if (response.status === 401) {
    const freshToken = await getCurrentIdToken(true);
    if (freshToken && freshToken !== token) {
      const retryHeaders: Record<string, string> = {
        'Authorization': `Bearer ${freshToken}`
      };
      if (body) {
        retryHeaders['Content-Type'] = 'application/json';
      }
      try {
        response = await fetch(url, {
          method,
          headers: retryHeaders,
          body: body ? JSON.stringify(body) : undefined
        });
      } catch (netErr: any) {
        throw new Error('Network connection failed during authorization retry. Please retry.');
      }
    }
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(data.error || 'Sentinel reflection rate limit reached. Please wait a moment and click Retry.');
    } else if (response.status === 503) {
      throw new Error(data.error || 'Sentinel reflection service is temporarily busy. Please retry in a moment.');
    } else if (response.status === 504) {
      throw new Error(data.error || 'Sentinel reflection request timed out. Please click Retry.');
    } else if (response.status === 400) {
      throw new Error(data.error || 'Sentinel was unable to process this reflection due to safety filters or input format.');
    }
    throw new Error(data.error || `Server request failed with status ${response.status}`);
  }

  return data;
}

export async function deleteReflectionEntry(entryId: string): Promise<void> {
  if (!entryId || !entryId.trim()) {
    throw new Error('Reflection entry identifier is required to delete.');
  }
  await fetchWithAuth(`/api/entries/${encodeURIComponent(entryId.trim())}`, undefined, 'DELETE');
}

export async function deleteDecisionCard(decisionId: string): Promise<void> {
  if (!decisionId || !decisionId.trim()) {
    throw new Error('Decision Card identifier is required to delete.');
  }
  await fetchWithAuth(`/api/decisions/${encodeURIComponent(decisionId.trim())}`, undefined, 'DELETE');
}

export async function postChatMessage(messages: ChatMessage[]): Promise<string> {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Cannot send reflection: message history is empty.');
  }

  const payload = messages
    .filter(m => m && typeof m.content === 'string' && m.content.trim().length > 0)
    .map(m => ({ role: m.role, content: m.content.trim() }));

  if (payload.length === 0) {
    throw new Error('Cannot send reflection: message content cannot be blank.');
  }

  const data = await fetchWithAuth('/api/gemini/chat', {
    messages: payload
  });

  // Comprehensive extraction across all known response fields and nested structures
  let reply = '';
  if (typeof data === 'string' && data.trim()) {
    reply = data.trim();
  } else if (data && typeof data === 'object') {
    const directFields = [
      data.reply,
      data.text,
      data.reflection,
      data.content,
      data.message,
      data.output,
      data.result
    ];
    for (const field of directFields) {
      if (typeof field === 'string' && field.trim()) {
        reply = field.trim();
        break;
      }
    }

    // Check candidate content parts if present in payload
    if (!reply && Array.isArray(data.candidates)) {
      for (const cand of data.candidates) {
        if (Array.isArray(cand?.content?.parts)) {
          const partsText = cand.content.parts
            .filter((p: any) => typeof p?.text === 'string' && p.text.trim())
            .map((p: any) => p.text.trim())
            .join('\n\n');
          if (partsText) {
            reply = partsText;
            break;
          }
        }
        if (typeof cand?.text === 'string' && cand.text.trim()) {
          reply = cand.text.trim();
          break;
        }
      }
    }

    // Check wrapped data object (e.g. data.data.reply)
    if (!reply && data.data && typeof data.data === 'object') {
      const nestedFields = [
        data.data.reply,
        data.data.text,
        data.data.reflection,
        data.data.content,
        data.data.message
      ];
      for (const field of nestedFields) {
        if (typeof field === 'string' && field.trim()) {
          reply = field.trim();
          break;
        }
      }
    }
  }

  if (!reply) {
    throw new Error('Sentinel returned an empty reflection. Please try rephrasing or click Retry.');
  }

  return reply;
}

export async function postGenerateDecisionCard(messages: ChatMessage[]): Promise<DecisionCardDraft> {
  const data = await fetchWithAuth('/api/gemini/decision', {
    messages: messages.map(m => ({ role: m.role, content: m.content }))
  });
  return data.draft;
}
