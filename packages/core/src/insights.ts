export type ChatMessage = { role: "user" | "assistant"; text: string };

/** Extract `data:` payloads from an SSE text block, skipping comments and [DONE]. */
export function parseSseData(chunk: string): string[] {
  return chunk
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .filter((payload) => payload.length > 0 && payload !== "[DONE]");
}

export interface StreamInsightsOptions {
  apiUrl: string;
  accessToken: string;
  month: string;
  messages: ChatMessage[];
}

/** Streams assistant text chunks from the matematica-ai-api /insights/chat endpoint. */
export async function* streamInsights(opts: StreamInsightsOptions): AsyncGenerator<string> {
  const res = await fetch(`${opts.apiUrl}/insights/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.accessToken}`,
    },
    body: JSON.stringify({ month: opts.month, messages: opts.messages }),
  });
  if (!res.ok) {
    throw new Error(
      res.status === 429
        ? "O assistente está ocupado. Tente novamente em instantes."
        : `Falha no assistente (${res.status}).`,
    );
  }
  // ponytail: RN fetch has no body stream — fall back to buffering the full reply.
  if (!res.body) {
    for (const payload of parseSseData(await res.text())) {
      yield JSON.parse(payload).text as string;
    }
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const payload of parseSseData(events.join("\n\n") + "\n\n")) {
      yield JSON.parse(payload).text as string;
    }
  }
}
