// Hello, thanks, "are you there": messages that are about the conversation, so searching the content can only fail.
export type SmallTalkKind = {
  id: string
  label: string
  enabled: boolean
  /** One per line: a phrase that must be the whole message, or /regex/. */
  patterns: string
  /** One per line: said the first time. */
  replies: string
  /** One per line, in order: said when they repeat themselves, so the tone can move on. */
  repeats: string
}

const kind = (
  id: string,
  label: string,
  patterns: string[],
  replies: string[],
  repeats: string[],
): SmallTalkKind => ({
  id,
  label,
  enabled: true,
  patterns: patterns.join("\n"),
  replies: replies.join("\n"),
  repeats: repeats.join("\n"),
})

export const DEFAULT_SMALL_TALK: SmallTalkKind[] = [
  kind(
    "greeting",
    "Hello",
    [
      "hi",
      "hello",
      "hey",
      "hiya",
      "howdy",
      "hi there",
      "hello there",
      "hey there",
      "good morning",
      "good afternoon",
      "good evening",
      "greetings",
      "yo",
      "sup",
      "whats up",
      "namaste",
      "vanakkam",
    ],
    [
      "Hello {name}! What can I help you with today?",
      "Hi {name}! What would you like to know?",
      "Hey {name}, good to hear from you. What are you looking for?",
    ],
    [
      "Hello again! I'm here and listening. What would you like to know?",
      "Still here, {name}! If you're checking that I'm awake, I am. Try me with a question about {topics}.",
      "I could say hello all day, but I'm more useful with a real question. Ask me about {topics}.",
      "Yes, I'm still here. Whenever you're ready, ask me anything, or contact us if you'd rather talk to a person.",
    ],
  ),
  kind(
    "wellbeing",
    "How are you",
    [
      "how are you",
      "how are you doing",
      "how r u",
      "how are u",
      "hows it going",
      "how is it going",
    ],
    ["Doing well, thanks for asking! What can I help you with?"],
    [
      "Still doing well! What would you like to know?",
      "No complaints here. Is there something I can look up for you?",
    ],
  ),
  kind(
    "check",
    "Are you there",
    [
      "are you there",
      "you there",
      "anyone there",
      "is anyone there",
      "anybody there",
      "is anybody there",
      "are you online",
      "you online",
      "are you awake",
      "are you working",
      "is this working",
      "does this work",
      "test",
      "testing",
      "test test",
      "ping",
    ],
    [
      "Yes, I'm here and working. What can I help you with?",
      "I'm online and listening. What would you like to know?",
    ],
    [
      "Still here and still working. Try a real question, such as something about {topics}.",
      "Test passed! Now try me with something harder.",
    ],
  ),
  kind(
    "identity",
    "Who are you",
    [
      "who are you",
      "what are you",
      "are you a bot",
      "are you human",
      "are you real",
      "are you a person",
      "are you ai",
      "are you an ai",
      "are you a robot",
      "is this a bot",
      "am i talking to a bot",
      "am i talking to a human",
      "am i talking to a person",
      "whats your name",
      "what is your name",
    ],
    [
      "I'm {assistant}, an AI assistant for this site. I answer from its content, and a person can help with anything I can't.",
    ],
    [
      "Still an AI, I promise. If you'd rather talk to a person, contact us and someone will help.",
      "Yes, AI all the way. What can I help you with?",
    ],
  ),
  kind(
    "capabilities",
    "What can you do",
    [
      "help",
      "help me",
      "can you help",
      "can you help me",
      "i need help",
      "what can i ask",
      "what can i ask you",
      "/^(so )?(what|how)( else)? (can|could|will|would) (you|u)( really| actually)? (do|help|assist)( me| us)?( for me| for us| with)?( here| today| now)?$/",
    ],
    [
      "I can answer questions about {topics}. What would you like to know?",
      "I answer questions using this site's own content, such as {topics}. What are you looking for?",
    ],
    [
      "The things I know best: {topics}. Pick one, or ask in your own words.",
      "For anything I can't answer, contact us and a person will help. Otherwise, ask away.",
    ],
  ),
  kind(
    "thanks",
    "Thanks",
    [
      "thanks",
      "thank you",
      "thanks a lot",
      "thank you so much",
      "thx",
      "ty",
      "cheers",
      "much appreciated",
    ],
    [
      "You're welcome! Anything else I can help with?",
      "Happy to help. Is there anything else?",
    ],
    ["Anytime, {name}.", "Glad I could help."],
  ),
  kind(
    "ack",
    "Okay",
    [
      "ok",
      "okay",
      "k",
      "cool",
      "great",
      "nice",
      "good",
      "got it",
      "alright",
      "fine",
      "sure",
      "yes",
      "no",
    ],
    ["Okay! Let me know if there's anything else you'd like to know."],
    ["I'm here whenever you need me.", "Just ask when you're ready."],
  ),
  kind(
    "teasing",
    "Teasing or testing",
    [
      "lol",
      "useless",
      "you are useless",
      "youre useless",
      "you are stupid",
      "youre stupid",
      "stupid bot",
      "dumb bot",
      "this is stupid",
      "/^(ha)+$/",
      "/^(he)+$/",
    ],
    ["Fair enough! Give me a real question and let me earn it back."],
    [
      "I can take it. Try me with something about {topics}.",
      "If I'm not helping, contact us and a person will take it from here.",
    ],
  ),
  kind(
    "bye",
    "Goodbye",
    [
      "bye",
      "goodbye",
      "good bye",
      "bye bye",
      "see you",
      "see ya",
      "good night",
    ],
    [
      "Goodbye {name}, and thanks for stopping by!",
      "Take care! I'm here if you need anything else.",
    ],
    ["Bye for now!", "See you next time."],
  ),
]

const normal = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
// Heyyy, helloooo and hii count as the word they stretch.
const squash = (s: string) => s.replace(/(\p{L})\1+/gu, "$1")

const lines = (s: string) =>
  s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

const MAX_LENGTH = 120

const matches = (k: SmallTalkKind, text: string) =>
  lines(k.patterns).some((line) => {
    const re = /^\/(.+)\/([a-z]*)$/.exec(line)
    if (!re) return squash(normal(line)) === squash(text)
    try {
      return new RegExp(re[1], "iu").test(text)
    } catch {
      return false
    }
  })

/** Which small talk a message is, if the whole message is small talk. A real question never matches. */
export const matchSmallTalk = (kinds: SmallTalkKind[], message: string) => {
  if (message.length > MAX_LENGTH) return null
  const text = normal(message)
  if (!text) return null
  const on = kinds.filter((k) => k.enabled)
  const whole = on.find((k) => matches(k, text))
  if (whole) return whole
  // "Hello, what can you do" is the question after the hello.
  for (const g of on.filter((k) => k.id === "greeting")) {
    for (const line of lines(g.patterns)) {
      const hi = normal(line)
      if (!hi || !text.startsWith(`${hi} `)) continue
      const rest = text.slice(hi.length + 1)
      const found = on.find((k) => k.id !== "greeting" && matches(k, rest))
      if (found) return found
    }
  }
  return null
}

export type Fill = { name?: string | null; assistant?: string; topics?: string }

/** Fills {name}, {assistant} and {topics}, tidying up after a blank. */
export const fillTemplate = (line: string, f: Fill) => {
  // A line offering topics reads badly with no topics to offer.
  if (line.includes("{topics}") && !f.topics) return ""
  const first = f.name && !f.name.includes("@") ? f.name.split(/\s+/)[0] : ""
  return line
    .replace(/\{name\}/g, first)
    .replace(/\{assistant\}/g, f.assistant || "the assistant")
    .replace(/\{topics\}/g, f.topics ?? "")
    .replace(/,\s*(?=[!.?,])/g, "")
    .replace(/\s+([!.?,])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim()
}

/**
 * The next thing to say that has not been said. Order keeps a sequence moving on; otherwise a random pick
 * keeps new chats from all sounding alike. When all have been said, the one said longest ago comes back.
 */
export const pickLine = (
  candidates: string[],
  said: string[],
  inOrder = false,
) => {
  if (!candidates.length) return null
  const fresh = candidates.filter((c) => !said.includes(c))
  if (fresh.length)
    return inOrder ? fresh[0] : fresh[Math.floor(Math.random() * fresh.length)]
  return [...candidates].sort(
    (a, b) => said.lastIndexOf(a) - said.lastIndexOf(b),
  )[0]
}

/** What to say for this kind, given how often they have said it and what has already been said. */
export const smallTalkLine = (
  k: SmallTalkKind,
  timesBefore: number,
  said: string[],
  fill: Fill,
) => {
  const filled = (text: string) =>
    lines(text)
      .map((l) => fillTemplate(l, fill))
      .filter(Boolean)
  const first = filled(k.replies)
  const again = filled(k.repeats)
  if (timesBefore > 0 && again.length) {
    // Skip ahead by count too, so someone who repeats themselves always gets further along.
    const ahead = again.slice(Math.min(timesBefore - 1, again.length - 1))
    return (
      pickLine(
        ahead.filter((l) => !said.includes(l)),
        said,
        true,
      ) ?? pickLine(again, said, true)
    )
  }
  return pickLine(first.length ? first : again, said)
}

/** Tells the model what kind of moment this is, so it replies to the moment and does not look anything up. */
export const smallTalkPrompt = (
  k: SmallTalkKind,
  timesBefore: number,
  suggestion: string,
  topics: string,
) =>
  [
    `The visitor's latest message is small talk, not a question to look up. It is of the kind "${k.label}".`,
    timesBefore > 0
      ? `They have sent this kind of message ${timesBefore} time${timesBefore > 1 ? "s" : ""} already in this chat, so they may be checking you are online, testing you or teasing. Respond to that with light good humour, and do not sound like a script.`
      : "This is the first time in this chat.",
    "Reply in one or two short sentences, in the language they used. Never repeat the wording of your earlier replies.",
    topics
      ? `You can offer to help with these topics, and with nothing more specific: ${topics}.`
      : "",
    "State no facts about the organisation. If asked, say plainly that you are an AI.",
    `The site owner's suggested reply, to reword: ${suggestion}`,
  ]
    .filter(Boolean)
    .join("\n")
