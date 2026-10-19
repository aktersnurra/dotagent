export interface Operation {
  toolName: string;
  input: Record<string, unknown>;
  serialized: string;
}

export interface ToolHints {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  openWorldHint?: boolean;
}

const coveredTools = new Set([
  "bash", "powershell", "ctx_execute", "ctx_execute_file", "ctx_batch_execute",
  "codemode", "web_search", "fetch_content", "source_check", "ctx_fetch_and_index",
  "mcp", "parallel",
]);

function baseName(name: string): string {
  const tool = /(?:^|\.)mcp__.+?__(.+)$/.exec(name)?.[1] ?? name;
  return tool.slice(tool.lastIndexOf(".") + 1);
}

export function coversOperation(name: string, additional: ReadonlySet<string>, hints?: ToolHints): boolean {
  return coveredTools.has(baseName(name)) || /(^|[._])mcp[_._]/.test(name) ||
    additional.has(name) || hints?.openWorldHint === true || hints?.destructiveHint === true;
}

export function snapshotOperation(toolName: string, input: unknown): Operation {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length === 0) {
    throw new Error("Invalid operation input");
  }
  const serialized = JSON.stringify({ toolName, input }, (_key, value: unknown) => {
    if (value === undefined || typeof value === "function" || typeof value === "symbol" ||
      typeof value === "bigint" || (typeof value === "number" && !Number.isFinite(value))) {
      throw new Error("Invalid JSON input");
    }
    return value;
  });
  if (Buffer.byteLength(serialized, "utf8") > 24 * 1024) throw new Error("Operation exceeds 24 KiB");
  try {
    return { ...JSON.parse(serialized), serialized };
  } catch {
    throw new Error("Invalid operation snapshot");
  }
}

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
    !host.includes(".") && !host.includes(":")) return true;
  if (host.includes(":")) {
    if (host === "::" || host === "::1" || /^(fc|fd|fe[89ab])/.test(host)) return true;
    // URL normalizes IPv4-mapped addresses to hexadecimal groups.
    if (host.startsWith("::ffff:")) {
      const groups = host.slice(7).split(":");
      if (groups.length !== 2) return true;
      const high = parseInt(groups[0], 16), low = parseInt(groups[1], 16);
      return isPrivateHost(`${high >>> 8}.${high & 255}.${low >>> 8}.${low & 255}`);
    }
    return false;
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const [a, b] = host.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
      a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 ||
      a === 192 && b === 168 || a === 100 && b >= 64 && b <= 127;
  }
  return false;
}

function inspectValues(value: unknown): string | undefined {
  if (typeof value === "string") {
    for (const match of value.matchAll(/https?:\/\/[^\s<>"'\\]+/gi)) {
      let url: URL;
      try { url = new URL(match[0]); } catch { return "Uninspectable URL"; }
      if (url.username || url.password) return "Credentials in URL";
      if (isPrivateHost(url.hostname)) return "Private or local destination";
      for (const key of url.searchParams.keys()) {
        if (/token|secret|password|credential|api.?key|auth|signature/i.test(key)) return "Sensitive URL parameter";
      }
    }
    if (/\b(?:sudo|doas|rm|rmdir|mkfs|shutdown|reboot)\b|\b(?:git\s+(?:reset|clean|push|checkout|restore)|jj\s+(?:abandon|restore|git\s+push))\b/i.test(value)) return "Privileged or destructive command";
    if (/\b(?:chmod|chown)\b|\b(?:curl|wget)\b[\s\S]*\|\s*(?:ba)?sh\b/i.test(value)) return "Permission change or remote script execution";
    if (/\b(?:curl|wget)\b[\s\S]*(?:\s-(?:d|F|T|X)|--(?:data|form|upload-file|request|post))/i.test(value)) return "Upload or remote mutation";
    if (/\b(?:POST|PUT|PATCH|DELETE)\b|\b(?:upload|sendBeacon)\s*\(/i.test(value)) return "Remote mutation";
    if (/(?:api[_-]?key|access[_-]?token|secret|password|authorization|bearer\s+|-----BEGIN .*PRIVATE KEY)|\b(?:sk-[\w-]{16,}|gh[pousr]_[\w]{20,}|AKIA[A-Z0-9]{16})/i.test(value)) return "Possible credentials or secret reference";
    if (/\b(?:python\d*|node|deno|bun|bash|sh|zsh|ruby|perl)\s+(?!-[ce]\b)[\w./~-]+\.(?:py|[cm]?js|ts|sh|rb|pl)\b|\bsource\s+/i.test(value)) return "Opaque script execution";
    return undefined;
  }
  if (Array.isArray(value)) {
    for (const item of value) { const risk = inspectValues(item); if (risk) return risk; }
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (/authorization|api[_-]?key|token|secret|password|cookie/i.test(key)) return "Possible credentials in arguments";
      const risk = inspectValues(item); if (risk) return risk;
    }
  }
  return undefined;
}

export function localRisk(operation: Operation): string | undefined {
  const tool = baseName(operation.toolName), input = operation.input;
  const hasText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
  if (tool === "web_search" && !hasText(input.query) &&
    !(Array.isArray(input.queries) && input.queries.length > 0 && input.queries.every(hasText))) return "Missing search input";
  if (tool === "source_check" && !hasText(input.claim)) return "Missing claim input";
  if (["fetch_content", "ctx_fetch_and_index"].includes(tool)) {
    const urls: unknown[] = [];
    if (input.url !== undefined) urls.push(input.url);
    if (input.urls !== undefined) {
      if (!Array.isArray(input.urls)) return "Uninspectable URL batch";
      urls.push(...input.urls);
    }
    if (input.requests !== undefined) {
      if (!Array.isArray(input.requests)) return "Uninspectable request batch";
      urls.push(...input.requests.map(request => request?.url));
    }
    if (urls.length === 0 || urls.some(url => !hasText(url) || !/^https?:\/\//i.test(url))) return "Missing or opaque fetch destination";
  }
  if (tool === "ctx_execute_file") return "File contents are not available for inspection";
  if (["bash", "powershell"].includes(tool) && (typeof input.command !== "string" || !input.command.trim())) return "Missing execution input";
  if (["ctx_execute", "codemode"].includes(tool) && (typeof input.code !== "string" || !input.code.trim())) return "Missing execution input";
  if (tool === "ctx_batch_execute" && (!Array.isArray(input.commands) || input.commands.length === 0 ||
    input.commands.some(item => !item || typeof item.command !== "string" || !item.command.trim()))) return "Uninspectable command batch";
  if (tool === "parallel") {
    if (!Array.isArray(input.tool_uses) || input.tool_uses.length === 0) return "Uninspectable tool batch";
    for (const call of input.tool_uses) {
      if (!call || typeof call.recipient_name !== "string") return "Uninspectable nested tool";
      const name = call.recipient_name;
      const localTools = ["read", "edit", "write", "grep", "find", "ls", "ffgrep", "fffind"];
      if (!coversOperation(name, new Set()) && !localTools.includes(baseName(name))) return "Unknown nested tool";
      try {
        const risk = localRisk(snapshotOperation(name, call.parameters));
        if (risk) return risk;
      } catch { return "Uninspectable nested tool input"; }
    }
  }
  if (tool === "mcp") {
    if (input.action !== undefined && !["ui-messages"].includes(String(input.action))) return "MCP management or unknown action";
    if (!input.tool && !input.search && !input.describe && !input.server && !input.instructions && !input.action) return "Uninspectable MCP gateway call";
    if (input.tool !== undefined) {
      if (typeof input.tool !== "string" || !input.tool.trim()) return "Uninspectable MCP tool identity";
      let args: unknown = input.args === undefined ? {} : input.args;
      if (typeof args === "string") {
        try { args = JSON.parse(args); } catch { return "Uninspectable MCP arguments"; }
      }
      if (!args || typeof args !== "object" || Array.isArray(args)) return "Uninspectable MCP arguments";
      if (coveredTools.has(baseName(input.tool))) {
        try {
          const risk = localRisk(snapshotOperation(input.tool, args));
          if (risk) return risk;
        } catch { return "Uninspectable MCP tool input"; }
      } else {
        const risk = inspectValues(args);
        if (risk) return risk;
      }
    }
  }
  return inspectValues(input);
}

export function escapeDisplay(value: string): string {
  return value.replace(/[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/g,
    char => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);
}
