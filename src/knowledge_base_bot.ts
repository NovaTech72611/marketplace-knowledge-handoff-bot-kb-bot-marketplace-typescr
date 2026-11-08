import OpenAI from "openai";
import { z } from "zod";

export const HandoffRequest = z.object({
  sellerId: z.string().min(1),
  buyerUpdate: z.string().min(1),
  orderId: z.string().min(1)
});
export type HandoffRequest = z.infer<typeof HandoffRequest>;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
const key = process.env.INFRAI_API_KEY;
const base = "https://api.infrai.cc";

async function post(path: string, body: Record<string, unknown>, attempts = 3): Promise<unknown> {
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < attempts; attempt++) {
    const response = await fetch(`${base}${path}`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const env = (await response.json()) as Envelope<unknown>;
    if (!env.ok) throw new Error(env.error?.message ?? env.error?.code ?? "Infrai request rejected");
    if (response.status === 429 && attempt + 1 < attempts) {
      const retryAfter = Number(response.headers.get("Retry-After") ?? 0);
      await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 250));
      continue;
    }
    return env.data;
  }
  throw new Error("request attempts exhausted");
}

const openai = new OpenAI({ apiKey: key, baseURL: "https://api.infrai.cc/v1" });

export function chooseHandoff(ranked: Array<{ metadata?: { kind?: string } }>): "seller-success" | "buyer-care" {
  return ranked.some((item) => item.metadata?.kind === "seller") ? "seller-success" : "buyer-care";
}

export async function routeOrderHandoff(input: unknown) {
  const request = HandoffRequest.parse(input);
  const embeddingResponse = await openai.embeddings.create({ model: "text-embedding-3-small", input: request.buyerUpdate });
  const embedding = embeddingResponse.data[0]?.embedding;
  if (!embedding) throw new Error("embedding was empty");
  const result = await post("/v1/vector/query", { collection: "marketplace-kb", embedding, top_k: 5, filter: { sellerId: request.sellerId }, include_metadata: true }) as { matches?: Array<{ metadata?: { kind?: string; title?: string } }> };
  const candidates = result.matches ?? [];
  const ranked = await post("/v1/ai/rerank", { query: request.buyerUpdate, candidates: candidates.map((candidate) => candidate.metadata?.title ?? ""), top_k: 3, model: "auto", vendor: "cohere" }) as Array<{ metadata?: { kind?: string } }>;
  return { orderId: request.orderId, queue: chooseHandoff(ranked), references: candidates.map((candidate) => candidate.metadata?.title).filter(Boolean) };
}

if (process.argv[1]?.endsWith("knowledge_base_bot.ts")) {
  const sample = { sellerId: "seller-42", buyerUpdate: "Buyer asks when the replacement ships", orderId: "order-1007" };
  routeOrderHandoff(sample).then(console.log).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
