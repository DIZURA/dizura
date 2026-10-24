/** Hand-off from the strategist chat to the blueprint wizard (same tab, sessionStorage). */
export const STRATEGIST_CHAT = "dz:strategist:chat";
export const STRATEGIST_CONTEXT = "dz:strategist:context";
export const OPEN_STRATEGIST = "dizura:open-strategist";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export function readSession<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeSession(key: string, value: unknown) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / storage full — the chat still works for this page view */
  }
}

/** Plain-text transcript (newest last), capped to what the blueprint API accepts. */
export const transcript = (turns: ChatTurn[], max = 4000) =>
  turns
    .map((m) => `${m.role === "user" ? "Client" : "Strategist"}: ${m.content}`)
    .join("\n")
    .slice(-max);
