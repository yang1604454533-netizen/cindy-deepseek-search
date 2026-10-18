/**
 * DeepSeek Search / Fetch tools for Pi (Cindy).
 *
 * Adds two model-callable tools:
 *   web_search — search the web, returns title / url / date / authority / summary
 *   web_fetch  — fetch one page as Markdown
 *
 * API docs: https://api-docs.deepseek.com/zh-cn/guides/search
 *
 * Key lookup order:
 *   1. env DEEPSEEK_API_KEY
 *   2. env DEEPSEEK_SEARCH_KEY_FILE (path to a file holding the key)
 *   3. key.txt next to this package's package.json
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const BASE = "https://api.deepseek.com/v1/tools";
const PACKAGE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MAX_TEXT = 4000;

function apiKey(): string {
	const fromEnv = process.env.DEEPSEEK_API_KEY?.trim();
	if (fromEnv) return fromEnv;
	const keyFile = process.env.DEEPSEEK_SEARCH_KEY_FILE?.trim() || join(PACKAGE_ROOT, "key.txt");
	try {
		const fromFile = readFileSync(keyFile, "utf8").trim();
		if (fromFile) return fromFile;
	} catch {}
	throw new Error(`Missing DeepSeek API key: set DEEPSEEK_API_KEY or put the key in ${keyFile}`);
}

async function post(path: string, body: unknown): Promise<any> {
	const res = await fetch(`${BASE}/${path}`, {
		method: "POST",
		headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	const text = await res.text();
	if (!res.ok) throw new Error(`DeepSeek ${path} returned HTTP ${res.status}: ${text.slice(0, 500)}`);
	return JSON.parse(text);
}

const clip = (s: string | null | undefined, n = MAX_TEXT) =>
	(typeof s === "string" && s.length > n ? `${s.slice(0, n)}\n...[truncated ${s.length - n} chars]` : s) ?? "";

export default function deepseekSearch(pi: ExtensionAPI) {
	pi.registerTool({
		name: "web_search",
		label: "Web Search",
		description:
			"Search the web with DeepSeek's search engine. Returns title, url, site, date, authority, rerank score and a long summary (or the page text with include_content). Supports query operators: site:, -site:, -word, \"exact phrase\", lang:zh,en, after:2025-01-01, before:2026. Read-only.",
		parameters: Type.Object({
			query: Type.String({ description: "Search query, 1-128 characters, may contain operators such as site: or lang:zh" }),
			count: Type.Optional(Type.Number({ description: "Number of results, 1-50 (default 10)" })),
			include_content: Type.Optional(Type.Boolean({ description: "Return the full page text instead of the summary (slower, larger)" })),
		}),
		annotations: { readOnlyHint: true, openWorldHint: true },

		async execute(_id, params) {
			const count = Math.min(Math.max(Math.round(params.count ?? 10), 1), 50);
			const data = await post("search", { query: params.query, count, need_content: params.include_content === true });
			const results: any[] = data.results ?? [];
			if (results.length === 0) return { content: [{ type: "text", text: "No results." }], details: { count: 0 } };

			const text = results
				.map((r, i) =>
					[
						`${i + 1}. ${r.title}`,
						`   ${r.url}`,
						`   site: ${r.site_name ?? "-"} | date: ${r.date ?? "-"} | authority: ${r.authority} | score: ${Number(r.rerank_score).toFixed(2)}`,
						params.include_content ? clip(r.content) : clip(r.summary || r.snippet),
					].join("\n"),
				)
				.join("\n\n");
			return { content: [{ type: "text", text }], details: { count: results.length } };
		},
	});

	pi.registerTool({
		name: "web_fetch",
		label: "Web Fetch",
		description: "Fetch one web page through DeepSeek's fetch service and return its title and Markdown body. Read-only.",
		parameters: Type.Object({
			url: Type.String({ description: "HTTP/HTTPS URL with a host, no credentials" }),
		}),
		annotations: { readOnlyHint: true, openWorldHint: true },

		async execute(_id, params) {
			const page = await post("fetch", { url: params.url });
			const body = clip(page.content, 20000);
			return {
				content: [{ type: "text", text: `# ${page.title || params.url}\n${params.url}\n\n${body}` }],
				details: { url: params.url, length: typeof page.content === "string" ? page.content.length : 0 },
			};
		},
	});
}
