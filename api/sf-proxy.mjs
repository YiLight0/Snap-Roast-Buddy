export const config = { runtime: "edge" };

const SF_BASE = process.env.SILICONFLOW_BASE_URL ?? "https://api.siliconflow.cn/v1";
const SF_KEY = process.env.SILICONFLOW_API_KEY ?? process.env.OPENAI_API_KEY ?? "";

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  if (!SF_KEY) {
    return new Response(JSON.stringify({ error: "Missing SILICONFLOW_API_KEY in environment." }), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }
  const url = new URL(req.url);
  const endpoint = url.searchParams.get("endpoint") ?? "";
  if (endpoint !== "chat/completions" && endpoint !== "images/generations") {
    return new Response(JSON.stringify({ error: "Invalid endpoint." }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }
  const upstreamUrl = `${SF_BASE.replace(/\/+$/, "")}/${endpoint}`;
  const upstream = await fetch(upstreamUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${SF_KEY}`,
      "content-type": req.headers.get("content-type") ?? "application/json"
    },
    body: req.body,
    duplex: "half"
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json"
    }
  });
}
