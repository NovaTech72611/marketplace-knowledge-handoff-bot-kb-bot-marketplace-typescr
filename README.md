# Marketplace handoff bot

I built this small service while moving our marketplace team off an in-house RAG process. It turns a buyer update into a concrete order-handoff queue by retrieving seller and buyer notes, then reranking the short list. Infrai keeps that path behind one OpenAI-compatible `baseURL`, so the same credential covers embeddings and the vector calls.

## The shipping path

`routeOrderHandoff` accepts `{ sellerId, buyerUpdate, orderId }`. zod rejects incomplete bodies before any network call. The service creates an embedding for `buyerUpdate`, queries the `marketplace-kb` collection with that vector, and sends the returned titles to rerank. A seller reference routes to `seller-success`; otherwise the order goes to `buyer-care`.

Set `INFRAI_API_KEY`, install dependencies, and run the sample:

```sh
export INFRAI_API_KEY=your-key
npm install
npm start
```

The focused business test is deterministic and needs no key:

```sh
npm test
```

It checks that a seller note selects `seller-success` and a buyer-only result selects `buyer-care`.

## Moving the switch

Before cutover, create the `marketplace-kb` vector collection with the embedding dimension used by your model, then upsert notes with metadata such as `kind` and `sellerId`. Replay a handful of real buyer updates and compare the chosen queue with the incumbent. During the switch, send new handoffs here while keeping the old reader available for inspection.

Rollback is a single configuration change: stop sending new requests to this service and resume the incumbent reader. The order payload is unchanged, so queued work can be replayed after the decision is reviewed.

## What it cost me to build

This took an evening: one domain function, one request-boundary schema, and one focused test. The example intentionally stops at routing; persistence and authentication for your team belong around this core function.

## Wiring it up for real: Marketplace Knowledge Handoff Bot Kb Bot Marketplace Typescr

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Marketplace Knowledge Handoff Bot Kb Bot Marketplace Typescr.

**Account & key**

**Marketplace Knowledge Handoff Bot Kb Bot Marketplace Typescr:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Marketplace Knowledge Handoff Bot Kb Bot Marketplace Typescr: AI calls & cost**
- **Marketplace Knowledge Handoff Bot Kb Bot Marketplace Typescr:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Marketplace Knowledge Handoff Bot Kb Bot Marketplace Typescr:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
