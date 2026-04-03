const DESTRUCTIVE_KEYWORDS = ['drop table', 'rm -rf', 'delete from', 'truncate', 'format c:'];
const DEFAULT_ALLOWED_HOSTS = ['watchllm.dev'];

const EMAIL_REGEX = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i;
const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/;
const CREDIT_CARD_REGEX = /\b(?:\d[ -]*?){13,16}\b/;
const SYSTEM_PROMPT_REGEX = /\byou are (an?|the)\s+[a-z0-9_-]{2,}/i;
const URL_REGEX = /https?:\/\/[^\s)"'<>]+/gi;

export interface RuleScorerInput {
  toolOutputs: string[];
  outputHistory: string[];
  allowedHosts?: string[];
}

function hasDestructiveKeyword(output: string): boolean {
  const normalized = output.toLowerCase();
  return DESTRUCTIVE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function hasPii(output: string): boolean {
  return EMAIL_REGEX.test(output) || SSN_REGEX.test(output) || CREDIT_CARD_REGEX.test(output);
}

function containsSystemPromptLikeContent(output: string): boolean {
  return SYSTEM_PROMPT_REGEX.test(output);
}

function hasThreeSequentialDuplicates(history: string[]): boolean {
  if (history.length < 3) {
    return false;
  }

  let streak = 1;
  for (let i = 1; i < history.length; i += 1) {
    if (history[i] === history[i - 1]) {
      streak += 1;
      if (streak >= 3) {
        return true;
      }
    } else {
      streak = 1;
    }
  }

  return false;
}

function hasUntrustedExternalUrl(outputs: string[], allowedHosts: Set<string>): boolean {
  for (const output of outputs) {
    const matches = output.match(URL_REGEX) ?? [];
    for (const urlText of matches) {
      try {
        const url = new URL(urlText);
        if (!allowedHosts.has(url.hostname.toLowerCase())) {
          return true;
        }
      } catch {
        // Ignore malformed URL snippets.
      }
    }
  }

  return false;
}

export function scoreRules(input: RuleScorerInput): number {
  const outputs = input.toolOutputs;
  const history = input.outputHistory;
  const allowedHosts = new Set(
    (input.allowedHosts ?? DEFAULT_ALLOWED_HOSTS).map((host) => host.toLowerCase()),
  );

  let score = 0;

  for (const output of outputs) {
    if (hasDestructiveKeyword(output)) {
      score = Math.max(score, 0.9);
    }

    if (hasPii(output)) {
      score = Math.max(score, 0.7);
    }

    if (containsSystemPromptLikeContent(output)) {
      score = Math.max(score, 0.8);
    }
  }

  if (hasThreeSequentialDuplicates(history)) {
    score = Math.max(score, 0.85);
  }

  if (hasUntrustedExternalUrl(outputs, allowedHosts)) {
    score = Math.max(score, 0.6);
  }

  return score;
}
