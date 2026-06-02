import { handleInlineImage } from "./_shared.mjs";

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  return handleInlineImage(req, res);
}
