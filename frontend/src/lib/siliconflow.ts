export interface SiliconFlowConfig {
  key: string;
  baseUrl: string;
  models: { chat: string; imageEdit: string };
}

let configPromise: Promise<SiliconFlowConfig> | undefined;
let useProxyFallback = false;

export function fetchSiliconFlowConfig(): Promise<SiliconFlowConfig> {
  if (!configPromise) {
    configPromise = (async () => {
      const res = await fetch("/api/sf-token");
      if (!res.ok) {
        configPromise = undefined;
        throw new Error(`无法获取 SiliconFlow 配置：HTTP ${res.status}`);
      }
      const payload = (await res.json()) as SiliconFlowConfig & { error?: string };
      if (payload.error) {
        configPromise = undefined;
        throw new Error(payload.error);
      }
      return payload;
    })();
  }
  return configPromise;
}

async function postSiliconFlow(endpoint: "chat/completions" | "images/generations", body: unknown): Promise<any> {
  const config = await fetchSiliconFlowConfig();

  const directUrl = `${config.baseUrl.replace(/\/+$/, "")}/${endpoint}`;
  const proxyUrl = `/api/sf-proxy?endpoint=${encodeURIComponent(endpoint)}`;

  const send = async (url: string, withAuth: boolean): Promise<Response> => {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (withAuth) headers.authorization = `Bearer ${config.key}`;
    return fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  };

  let response: Response;
  if (useProxyFallback) {
    response = await send(proxyUrl, false);
  } else {
    try {
      response = await send(directUrl, true);
    } catch (err) {
      // TypeError 通常意味着 CORS preflight 失败或网络错误，降级到同源 proxy。
      if (err instanceof TypeError) {
        useProxyFallback = true;
        console.warn("[siliconflow] direct call blocked, falling back to /api/sf-proxy:", err.message);
        response = await send(proxyUrl, false);
      } else {
        throw err;
      }
    }
  }

  const text = await response.text();
  if (!response.ok) {
    const snippet = text.trim().slice(0, 240) || `HTTP ${response.status}`;
    throw new Error(`SiliconFlow ${endpoint} 失败：${snippet}`);
  }
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`SiliconFlow ${endpoint} 返回非 JSON：${text.trim().slice(0, 240)}`);
  }
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
}

export async function chatCompletion(options: ChatCompletionOptions): Promise<any> {
  const config = await fetchSiliconFlowConfig();
  return postSiliconFlow("chat/completions", {
    model: config.models.chat,
    messages: options.messages,
    temperature: options.temperature ?? 0.78
  });
}

export interface ImageEditOptions {
  prompt: string;
  imageDataUrl: string;
}

export async function imageEdit(options: ImageEditOptions): Promise<any> {
  const config = await fetchSiliconFlowConfig();
  return postSiliconFlow("images/generations", {
    model: config.models.imageEdit,
    prompt: options.prompt,
    num_inference_steps: 20,
    guidance_scale: 4,
    image: options.imageDataUrl,
    image2: options.imageDataUrl,
    image3: options.imageDataUrl
  });
}
