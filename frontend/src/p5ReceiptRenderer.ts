import p5 from "p5";

type ReceiptMode = "simple" | "bigText" | "face" | "receipt" | "big_text" | "pixel_expression" | "expression";
type RoastLevel = "gentle" | "normal" | "spicy" | "execution" | "public_execution";

type RendererOptions = {
  mangaImageUrl?: string;
  mangaMode?: "none" | "top" | "bottom" | "standalone";
};

type NormalizedReceiptData = {
  title: string;
  subtitle: string;
  photoType: string;
  atmosphere: string;
  aiMood: string;
  findings: string[];
  scores: Array<{ label: string; value: number }>;
  roast: string;
  advice: string;
  verdict: string;
  topLabel: string;
  headline: string;
  subHeadline: string;
  oneLineRoast: string;
  tinyAdvice: string;
  moodLabel: string;
  keywords: string[];
  shortComment: string;
};

const receiptWidth = 384;
const rendererMap = new WeakMap<HTMLElement, p5>();

const bodyFont = "PingFang SC, Hiragino Sans GB, Microsoft YaHei, Noto Sans SC, SimHei, sans-serif";
const displayFont = "FZLanTingHeiS-EB-GB, Source Han Sans SC, Noto Sans CJK SC, PingFang SC, Microsoft YaHei, SimHei, sans-serif";
const serifFont = "Songti SC, STSong, Source Han Serif SC, Noto Serif CJK SC, Noto Serif SC, SimSun, serif";

export function initP5ReceiptRenderer(container: HTMLElement) {
  container.classList.add("p5-receipt-host");
}

export function destroyReceiptPreviews(root: HTMLElement) {
  const hosts = root.classList.contains("p5-receipt-host")
    ? [root]
    : Array.from(root.querySelectorAll<HTMLElement>(".p5-receipt-host"));
  hosts.forEach((host) => {
    rendererMap.get(host)?.remove();
    rendererMap.delete(host);
  });
}

export function updateReceiptPreview(
  container: HTMLElement,
  data: unknown,
  receiptMode: ReceiptMode,
  roastLevel: RoastLevel,
  options: RendererOptions = {}
) {
  initP5ReceiptRenderer(container);
  rendererMap.get(container)?.remove();
  container.innerHTML = "";

  const mode = normalizeReceiptMode(receiptMode);
  const intensity = getRoastIntensity(roastLevel);
  const normalized = normalizeReceiptData(data);
  const baseHeight = getReceiptHeight(mode, roastLevel, normalized);
  const mangaBlockHeight = options.mangaImageUrl && options.mangaMode && options.mangaMode !== "none" ? 292 : 0;
  const height = baseHeight + mangaBlockHeight;

  const sketch = (p: p5) => {
    let mangaImage: p5.Image | undefined;

    p.setup = () => {
      const canvas = p.createCanvas(receiptWidth, height);
      canvas.parent(container);
      p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
      p.noLoop();
      p.textFont(bodyFont);
      drawReceipt(p, normalized, mode, roastLevel, intensity, baseHeight, options, mangaImage);
      if (options.mangaImageUrl && options.mangaMode && options.mangaMode !== "none") {
        p.loadImage(
          options.mangaImageUrl,
          (image) => {
            mangaImage = image;
            drawReceipt(p, normalized, mode, roastLevel, intensity, baseHeight, options, mangaImage);
          },
          () => drawReceipt(p, normalized, mode, roastLevel, intensity, baseHeight, options, undefined)
        );
      }
    };
  };

  rendererMap.set(container, new p5(sketch));
  container.style.setProperty("--paper-height", `${height}px`);
  return { width: receiptWidth, height };
}

export function renderReceipt(data: unknown, receiptMode: ReceiptMode, roastLevel: RoastLevel, container: HTMLElement) {
  return updateReceiptPreview(container, data, receiptMode, roastLevel);
}

export function renderSimpleReceipt(p: p5, data: unknown, roastLevel: RoastLevel) {
  const normalized = normalizeReceiptData(data);
  renderSimpleReceiptCanvas(p, normalized, getRoastIntensity(roastLevel), getReceiptHeight("simple", roastLevel, normalized), roastLevel);
}

export function renderBigTextReceipt(p: p5, data: unknown, roastLevel: RoastLevel) {
  const normalized = normalizeReceiptData(data);
  renderBigTextReceiptCanvas(p, normalized, getRoastIntensity(roastLevel), getReceiptHeight("bigText", roastLevel, normalized), roastLevel);
}

export function renderFaceReceipt(p: p5, data: unknown, roastLevel: RoastLevel) {
  const normalized = normalizeReceiptData(data);
  renderFaceReceiptCanvas(p, normalized, getRoastIntensity(roastLevel), getReceiptHeight("face", roastLevel, normalized), roastLevel);
}

export function getRoastIntensity(roastLevel: RoastLevel): number {
  if (roastLevel === "gentle") return 0.25;
  if (roastLevel === "normal") return 0.5;
  if (roastLevel === "spicy") return 0.75;
  return 1;
}

export function getReceiptHeight(mode: "simple" | "bigText" | "face", roastLevel: RoastLevel, data: NormalizedReceiptData = normalizeReceiptData({})) {
  const intensity = getRoastIntensity(roastLevel);
  if (mode === "simple") {
    const textLoad = data.findings.join("").length + data.roast.length + data.advice.length + data.verdict.length;
    return Math.round(470 + intensity * 480 + Math.min(300, textLoad * (0.72 + intensity * 0.42)));
  }
  if (mode === "bigText") return Math.round(520 + intensity * 220);
  return Math.round(560 + intensity * 230);
}

export function wrapChineseText(p: p5, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  const paragraphs = String(text || "").split(/\n+/);
  for (const paragraph of paragraphs) {
    let line = "";
    for (const char of [...paragraph]) {
      const next = line + char;
      if (line && p.textWidth(next) > maxWidth) {
        lines.push(line);
        line = char;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
  }
  return lines.length ? lines : [""];
}

export function drawDashedLine(p: p5, x1: number, y: number, x2: number, dash = 9, gap = 6) {
  p.push();
  p.stroke(0);
  p.strokeWeight(1.6);
  for (let x = x1; x < x2; x += dash + gap) p.line(x, y, Math.min(x + dash, x2), y);
  p.pop();
}

export function drawStamp(p: p5, text: string, x: number, y: number, size = 72, angle = -0.15) {
  p.push();
  p.translate(x, y);
  p.rotate(angle);
  p.noFill();
  p.stroke(0);
  p.strokeWeight(3);
  p.rectMode(p.CENTER);
  p.rect(0, 0, size * 1.55, size * 0.64);
  p.textFont(displayFont);
  p.textAlign(p.CENTER, p.CENTER);
  p.textStyle(p.BOLD);
  p.textSize(size * 0.22);
  p.noStroke();
  p.fill(0);
  p.text(text, 0, 0);
  p.pop();
}

export function drawTag(p: p5, text: string, x: number, y: number, inverted = false, angle = 0) {
  const safeText = squeezeText(text, 8);
  p.push();
  p.translate(x, y);
  p.rotate(angle);
  p.textFont(bodyFont);
  p.textStyle(p.BOLD);
  p.textSize(12);
  const width = Math.max(44, p.textWidth(safeText) + 14);
  p.stroke(0);
  p.strokeWeight(1.6);
  p.fill(inverted ? 0 : 255);
  p.rect(0, -14, width, 22);
  p.noStroke();
  p.fill(inverted ? 255 : 0);
  p.textAlign(p.LEFT, p.CENTER);
  p.text(safeText, 7, -3);
  p.pop();
}

export function drawSpeedLines(p: p5, x: number, y: number, width: number, count: number, angle = -0.25) {
  p.push();
  p.stroke(0);
  p.strokeWeight(1.8);
  for (let i = 0; i < count; i += 1) {
    const yy = y + i * 8;
    const len = width * (0.32 + seededUnit(i + 17) * 0.58);
    p.line(x + (i % 3) * 8, yy, x + len, yy + Math.sin(angle) * len * 0.22);
  }
  p.pop();
}

export function extractShortWords(data: unknown): string[] {
  const normalized = normalizeReceiptData(data);
  const pool = [
    normalized.photoType,
    normalized.atmosphere,
    normalized.aiMood,
    normalized.moodLabel,
    ...normalized.keywords,
    ...normalized.findings,
    normalized.verdict,
    normalized.headline,
    normalized.oneLineRoast
  ];
  const words = pool
    .flatMap((item) => splitChinesePhrases(String(item || "")))
    .map((item) => item.trim())
    .filter((item) => item.length >= 2 && item.length <= 7);
  return Array.from(new Set(words)).slice(0, 24);
}

export function drawTextDensityBlock(p: p5, phrases: string[], x: number, y: number, width: number, height: number, intensity: number) {
  const pool = phrases.filter(Boolean).flatMap((phrase) => splitChinesePhrases(phrase)).filter(Boolean);
  const safePool = pool.length ? pool : ["继续检测", "画面过载", "现场失控"];
  const rows = Math.round(18 + intensity * 46);
  p.push();
  p.textFont(bodyFont);
  p.textAlign(p.LEFT, p.TOP);
  p.noStroke();
  for (let i = 0; i < rows; i += 1) {
    const t = i / Math.max(1, rows - 1);
    const yy = y + t * height;
    const density = Math.pow(t, 1.65);
    const size = 10.5 + density * 8;
    const leading = 16 - density * 12;
    const repeats = Math.round(1 + density * 9 + intensity * 2);
    p.textSize(size);
    p.textStyle(t > 0.6 ? p.BOLD : p.NORMAL);
    for (let j = 0; j < repeats; j += 1) {
      const word = safePool[(i * 5 + j * 3) % safePool.length];
      const xx = x + seededUnit(i * 97 + j * 31) * Math.max(1, width - 38);
      p.push();
      p.translate(xx, yy + j * leading * (0.36 - density * 0.25));
      p.rotate((seededUnit(i * 13 + j * 11) - 0.5) * density * 0.32);
      p.fill(0, 95 + density * 160);
      p.text(word, 0, 0);
      p.pop();
    }
  }
  p.pop();
}

function drawReceipt(
  p: p5,
  data: NormalizedReceiptData,
  mode: "simple" | "bigText" | "face",
  roastLevel: RoastLevel,
  intensity: number,
  baseHeight: number,
  options: RendererOptions,
  mangaImage?: p5.Image
) {
  p.background(255);
  p.textFont(bodyFont);
  p.noStroke();
  p.fill(0);
  drawThermalTexture(p, baseHeight + (options.mangaImageUrl && options.mangaMode !== "none" ? 292 : 0), intensity);

  let offsetY = 0;
  if (options.mangaImageUrl && options.mangaMode === "top") {
    drawMangaBlock(p, mangaImage, 0, options.mangaImageUrl);
    offsetY = 292;
  }

  p.push();
  p.translate(0, offsetY);
  if (mode === "simple") renderSimpleReceiptCanvas(p, data, intensity, baseHeight, roastLevel);
  if (mode === "bigText") renderBigTextReceiptCanvas(p, data, intensity, baseHeight, roastLevel);
  if (mode === "face") renderFaceReceiptCanvas(p, data, intensity, baseHeight, roastLevel);
  p.pop();

  if (options.mangaImageUrl && options.mangaMode === "bottom") drawMangaBlock(p, mangaImage, baseHeight, options.mangaImageUrl);
}

function renderSimpleReceiptCanvas(p: p5, data: NormalizedReceiptData, intensity: number, height: number, roastLevel: RoastLevel) {
  const margin = 18;
  const width = receiptWidth - margin * 2;
  const execution = roastLevel === "execution" || roastLevel === "public_execution";
  const words = extractShortWords(data);
  let y = 24;

  drawMicroHeader(p, data, intensity);
  y += 82;

  const scoreCount = intensity < 0.35 ? 2 : 3;
  drawScoreBands(p, data.scores.slice(0, scoreCount), margin, y, width, intensity);
  y += 58 + scoreCount * 18;

  drawSectionLabel(p, "图像检测", margin, y, intensity);
  y += 30;
  p.textFont(bodyFont);
  p.textAlign(p.LEFT, p.TOP);
  p.fill(0);
  p.textStyle(p.BOLD);
  p.textSize(14);
  const findingCount = intensity < 0.35 ? 2 : intensity < 0.75 ? 3 : data.findings.length;
  for (const [index, finding] of data.findings.slice(0, findingCount).entries()) {
    const rowY = y + index * (29 - intensity * 5);
    drawVerticalIndex(p, index + 1, margin, rowY + 2);
    y = drawWrappedLine(p, finding, margin + 26, rowY, width - 26, 14, 19 - intensity * 2, 0);
  }

  y += 18;
  const quoteStart = y;
  const mainParagraphs = compactParagraphs([data.roast, data.advice, data.verdict]);
  mainParagraphs.forEach((paragraph, index) => {
    const t = execution ? y / height : 0;
    const size = 15 + intensity * 2 + t * 2.2;
    const leading = execution ? Math.max(9, 22 - t * 15) : 21 - intensity * 2;
    p.textFont(index === 0 ? displayFont : bodyFont);
    p.textStyle(index === 0 ? p.BOLD : p.NORMAL);
    p.textSize(size);
    if (index === 0) drawSideCaption(p, "AI 旁白", receiptWidth - 32, y + 2, intensity);
    y = drawWrappedLine(p, paragraph, margin + jitterDet(8, intensity * t, index), y, width - 8, size, leading, t * intensity * 0.32);
    y += execution ? Math.max(2, 18 - t * 18) : 18 - intensity * 5;
  });

  drawPoeticWordField(p, words, margin, quoteStart - 12, width, Math.max(112, y - quoteStart + 18), intensity, execution ? "dense" : "light");

  if (intensity >= 0.62) {
    drawStamp(p, intensity >= 1 ? "事故归档" : "重点观察", 282, 205 + intensity * 46, 82 + intensity * 13, -0.16);
    drawSpeedLines(p, 240, 86, 104, Math.round(4 + intensity * 7));
  }

  const tagY = Math.min(height - 178, y + 10);
  for (let i = 0; i < Math.round(2 + intensity * 9); i += 1) {
    drawTag(p, words[i % words.length] || "过载", 18 + ((i * 71) % 260), tagY + i * (19 - intensity * 2), i % 4 === 0, (i % 2 ? -1 : 1) * 0.055 * intensity);
  }

  if (execution) {
    const blockY = height * 0.68;
    drawDensityRamp(p, [data.roast, data.advice, data.verdict, ...words], margin - 4, blockY, width + 8, height - blockY - 18, intensity);
  } else {
    drawBarcode(p, margin, height - 58, width, 34, intensity);
  }
}

function renderBigTextReceiptCanvas(p: p5, data: NormalizedReceiptData, intensity: number, height: number, roastLevel: RoastLevel) {
  const phrase = cleanBigPhrase(data.oneLineRoast || data.headline || data.roast);
  const chunks = splitBigPhrase(phrase);
  const words = extractShortWords(data);
  const execution = roastLevel === "execution" || roastLevel === "public_execution";

  drawPosterHeader(p, data, intensity);
  drawSpeedLines(p, 20, 78, 310, Math.round(4 + intensity * 10), -0.38);

  const startY = 122;
  const usableH = height - 178;
  const dominant = chunks[0] || phrase.slice(0, 3);
  const secondary = chunks.slice(1, execution ? 5 : 4);
  const dominantSize = fitTextSize(p, dominant, receiptWidth * 1.08, receiptWidth * (0.75 + intensity * 0.42), 54, 178);

  p.push();
  p.translate(receiptWidth / 2 + jitterDet(12, intensity, 1), startY + dominantSize * 0.5);
  p.rotate(-0.06 - intensity * 0.08);
  p.textFont(displayFont);
  p.textAlign(p.CENTER, p.CENTER);
  p.textStyle(p.BOLD);
  p.textSize(dominantSize);
  drawGhostText(p, dominant, intensity, 0, 0);
  p.fill(0);
  p.text(dominant, 0, 0);
  p.pop();

  let y = startY + dominantSize * (0.78 - intensity * 0.08);
  secondary.forEach((chunk, index) => {
    const target = receiptWidth * (0.82 + intensity * 0.22);
    const size = fitTextSize(p, chunk, target, receiptWidth * (0.48 + intensity * 0.22), 34, 112 + intensity * 34);
    p.push();
    p.translate(receiptWidth / 2 + jitterDet(20, intensity, index + 5), y + size * 0.48);
    p.rotate((index % 2 ? 1 : -1) * (0.035 + intensity * 0.095));
    p.textFont(index % 2 ? serifFont : displayFont);
    p.textAlign(p.CENTER, p.CENTER);
    p.textStyle(p.BOLD);
    p.textSize(size);
    drawGhostText(p, chunk, intensity * 0.8, 0, 0);
    p.fill(0);
    p.text(chunk, 0, 0);
    p.pop();
    if (index === 0 && intensity > 0.55) drawBlackSlash(p, y + size * 0.62, intensity);
    y += size * (0.74 - intensity * 0.07);
  });

  drawCurvedSentenceBand(p, [data.subHeadline, data.tinyAdvice, data.verdict, ...words], receiptWidth / 2, Math.min(height - 182, y + 42), 164, 50 + intensity * 34, intensity);

  const noteCount = Math.round(5 + intensity * 14);
  for (let i = 0; i < noteCount; i += 1) {
    const note = words[i % words.length] || data.tinyAdvice;
    const xx = 18 + seededUnit(i * 41) * 302;
    const yy = 126 + seededUnit(i * 67) * Math.max(110, usableH);
    drawTinyAnnotation(p, note, xx, yy, (seededUnit(i * 13) - 0.5) * intensity * 0.85, i % 5 === 0);
  }

  if (execution) {
    p.textFont(displayFont);
    p.textAlign(p.CENTER, p.CENTER);
    p.textStyle(p.BOLD);
    p.textSize(18);
    for (let yy = height - 126; yy < height - 24; yy += 18) {
      p.fill(0, 118);
      p.text(`/// ${phrase} ///`, receiptWidth / 2, yy);
    }
  } else {
    drawBarcode(p, 28, height - 48, receiptWidth - 56, 24, intensity);
  }
}

function renderFaceReceiptCanvas(p: p5, data: NormalizedReceiptData, intensity: number, height: number, roastLevel: RoastLevel) {
  const words = extractShortWords(data);
  const pattern = facePatternType(roastLevel, data);
  const cx = receiptWidth / 2;
  const cy = height * 0.47;
  const faceW = 268 + intensity * 46;
  const faceH = 330 + intensity * 78;

  drawTag(p, `${data.moodLabel} / ${pattern}`, 18, 38, intensity > 0.72, 0);
  drawWordFaceContour(p, words, cx, cy, faceW, faceH, intensity);

  const eyeWord = words[0] || "嗯？";
  const browWord = words[1] || "行吧";
  const mouthWord = words[2] || squeezeText(data.shortComment, 4);
  const angry = pattern === "angry" || pattern === "breakdown" || pattern === "judgement";
  const disgust = pattern === "disgust" || pattern === "speechless";

  drawFaceFeature(p, browWord, cx - 76, cy - 100, 34 + intensity * 18, angry ? -0.38 : -0.13, intensity);
  drawFaceFeature(p, browWord, cx + 76, cy - 100, 34 + intensity * 18, angry ? 0.38 : 0.13, intensity);
  drawFaceFeature(p, eyeWord, cx - 68, cy - 50, 35 + intensity * 18, disgust ? 0.18 : -0.03, intensity);
  drawFaceFeature(p, eyeWord, cx + 68, cy - 50, 35 + intensity * 18, disgust ? -0.18 : 0.03, intensity);

  if (pattern === "smile" || pattern === "confused") {
    drawTextArc(p, [mouthWord, data.shortComment, ...words], cx, cy + 72, 92, 45, 0.14, Math.PI - 0.14, 13 + intensity * 5);
  } else if (pattern === "breakdown" || pattern === "judgement") {
    drawTextArc(p, [mouthWord, data.shortComment, ...words], cx, cy + 78, 120, 84, 0.03, Math.PI * 1.97, 15 + intensity * 8);
    p.stroke(0);
    p.strokeWeight(3 + intensity * 4);
    p.noFill();
    p.rect(cx - 76, cy + 32, 152, 110);
  } else {
    drawFaceFeature(p, mouthWord.repeat(2).slice(0, 8), cx, cy + 74, 48 + intensity * 34, disgust ? -0.16 : 0.08, intensity);
  }

  drawEmotionRain(p, [data.shortComment, ...words], 22, 98, receiptWidth - 44, height - 148, intensity, pattern);

  if (intensity >= 0.75) drawSpeedLines(p, 20, height - 122, 320, Math.round(7 + intensity * 9), -0.25);
  if (intensity >= 1) drawTextDensityBlock(p, [data.shortComment, data.verdict, ...words], 20, height - 154, 344, 124, 0.72);
}

function normalizeReceiptData(data: unknown): NormalizedReceiptData {
  const value = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const findings = arrayOfStrings(value.findings ?? value.tags ?? value.keywords);
  const keywords = arrayOfStrings(value.keywords ?? value.tags ?? value.findings);
  const scores = Array.isArray(value.scores)
    ? (value.scores as Array<{ label?: unknown; value?: unknown }>).map((score, index) => ({
        label: String(score.label ?? `评分${index + 1}`),
        value: Number(score.value ?? 50)
      }))
    : [
        { label: "构图风险", value: 72 },
        { label: "吐槽浓度", value: 84 },
        { label: "可发表程度", value: 58 }
      ];
  const roast = firstString(value.roast, value.oneLineRoast, value.shortComment, value.caption, value.aiComment, value.generatedComment, "这张照片很努力，努力到机器都想递一张补拍申请。");

  return {
    title: firstString(value.title, "SNAP ROAST BUDDY"),
    subtitle: firstString(value.subtitle, value.topLabel, "AI 照片检测小票"),
    photoType: firstString(value.photoType, value.sceneType, keywords[0], "生活切片"),
    atmosphere: firstString(value.atmosphere, value.mood, "努力营业中"),
    aiMood: firstString(value.aiMood, value.moodLabel, "正在憋笑"),
    findings: findings.length ? findings : ["主体和背景正在争夺主场", "画面诚意很足，秩序稍微掉线"],
    scores,
    roast,
    advice: firstString(value.advice, value.tinyAdvice, "建议下次先稳住镜头，再稳住全场。"),
    verdict: firstString(value.verdict, value.headline, "可发，但需要配文自救。"),
    topLabel: firstString(value.topLabel, value.subtitle, ">>> 现场判定 <<<"),
    headline: firstString(value.headline, value.verdict, roast.slice(0, 8)),
    subHeadline: firstString(value.subHeadline, value.subtitle, ""),
    oneLineRoast: firstString(value.oneLineRoast, roast),
    tinyAdvice: firstString(value.tinyAdvice, value.advice, "建议：重拍也不是不行"),
    moodLabel: firstString(value.moodLabel, value.aiMood, "无语检测"),
    keywords,
    shortComment: firstString(value.shortComment, roast)
  };
}

function normalizeReceiptMode(mode: ReceiptMode): "simple" | "bigText" | "face" {
  if (mode === "bigText" || mode === "big_text") return "bigText";
  if (mode === "face" || mode === "pixel_expression" || mode === "expression") return "face";
  return "simple";
}

function drawThermalTexture(p: p5, height: number, intensity: number) {
  p.push();
  p.stroke(0, 10);
  p.strokeWeight(1);
  for (let y = 0; y < height; y += 11) p.line(0, y, receiptWidth, y);
  p.stroke(0, 18 + intensity * 12);
  const points = Math.round(90 + intensity * 160);
  for (let i = 0; i < points; i += 1) {
    p.point(seededUnit(i * 17) * receiptWidth, seededUnit(i * 31) * height);
  }
  p.pop();
}

function drawMangaBlock(p: p5, image: p5.Image | undefined, y: number, imageUrl: string) {
  p.push();
  drawDashedLine(p, 18, y + 16, receiptWidth - 18);
  p.noStroke();
  p.fill(0);
  p.textFont(displayFont);
  p.textAlign(p.CENTER, p.TOP);
  p.textStyle(p.BOLD);
  p.textSize(17);
  p.text("[ BUDDY COMIC STRIP ]", receiptWidth / 2, y + 32);
  p.stroke(0);
  p.strokeWeight(2);
  p.noFill();
  p.rect(18, y + 62, receiptWidth - 36, 200);
  if (image) {
    p.image(image, 26, y + 70, receiptWidth - 52, 184);
  } else {
    p.noStroke();
    p.fill(0);
    p.textFont(bodyFont);
    p.textSize(13);
    p.text("漫画加载中", receiptWidth / 2, y + 148);
    if (imageUrl.startsWith("data:")) p.text("本地图片", receiptWidth / 2, y + 170);
  }
  drawDashedLine(p, 18, y + 278, receiptWidth - 18);
  p.pop();
}

function drawMicroHeader(p: p5, data: NormalizedReceiptData, intensity: number) {
  p.push();
  p.textAlign(p.LEFT, p.TOP);
  p.textFont(displayFont);
  p.textStyle(p.BOLD);
  p.textSize(22 + intensity * 5);
  p.fill(0);
  p.text(data.title, 18, 18);
  p.textFont(bodyFont);
  p.textSize(11);
  p.textStyle(p.NORMAL);
  p.text(`${data.subtitle} / ${data.photoType}`, 20, 51);
  drawDashedLine(p, 18, 72, receiptWidth - 18, 8, 5);
  drawTag(p, data.aiMood, receiptWidth - 126, 58, intensity > 0.7, 0.02 * intensity);
  p.pop();
}

function drawPosterHeader(p: p5, data: NormalizedReceiptData, intensity: number) {
  p.push();
  p.fill(0);
  p.noStroke();
  p.rect(0, 0, receiptWidth, 58 + intensity * 12);
  p.fill(255);
  p.textFont(displayFont);
  p.textAlign(p.LEFT, p.TOP);
  p.textStyle(p.BOLD);
  p.textSize(23 + intensity * 5);
  p.text("判词", 18, 12);
  p.textSize(12);
  p.textFont(bodyFont);
  p.text(data.topLabel || "SNAP VERDICT", 86, 18);
  p.pop();
}

function drawScoreBands(p: p5, scores: Array<{ label: string; value: number }>, x: number, y: number, width: number, intensity: number) {
  p.push();
  p.textFont(bodyFont);
  p.textAlign(p.LEFT, p.TOP);
  scores.forEach((score, index) => {
    const yy = y + index * 22;
    p.noStroke();
    p.fill(0);
    p.textStyle(p.BOLD);
    p.textSize(12);
    p.text(squeezeText(score.label, 6), x, yy);
    p.stroke(0);
    p.strokeWeight(1.5);
    p.noFill();
    p.rect(x + 78, yy + 4, width - 124, 9);
    p.noStroke();
    p.fill(0);
    p.rect(x + 78, yy + 4, Math.max(10, (width - 124) * clamp(score.value / 100, 0, 1)), 9);
    p.textAlign(p.RIGHT, p.TOP);
    p.text(`${Math.round(score.value)}`, x + width, yy - 1);
    p.textAlign(p.LEFT, p.TOP);
  });
  if (intensity > 0.7) drawSpeedLines(p, x + 224, y + 2, 94, 4 + Math.round(intensity * 4), -0.2);
  p.pop();
}

function drawSectionLabel(p: p5, text: string, x: number, y: number, intensity: number) {
  p.push();
  p.fill(0);
  p.rect(x, y - 2, 86 + intensity * 22, 21);
  p.fill(255);
  p.textFont(displayFont);
  p.textAlign(p.LEFT, p.TOP);
  p.textStyle(p.BOLD);
  p.textSize(12);
  p.text(text, x + 8, y + 2);
  p.pop();
}

function drawVerticalIndex(p: p5, value: number, x: number, y: number) {
  p.push();
  p.textFont(displayFont);
  p.textStyle(p.BOLD);
  p.textSize(11);
  p.textAlign(p.CENTER, p.TOP);
  p.fill(255);
  p.stroke(0);
  p.strokeWeight(1.4);
  p.rect(x, y, 18, 18);
  p.noStroke();
  p.fill(0);
  p.text(String(value).padStart(2, "0"), x + 9, y + 2);
  p.pop();
}

function drawSideCaption(p: p5, text: string, x: number, y: number, intensity: number) {
  p.push();
  p.translate(x, y);
  p.rotate(Math.PI / 2);
  p.textFont(serifFont);
  p.textStyle(p.NORMAL);
  p.textSize(12 + intensity * 2);
  p.fill(0, 120);
  p.textAlign(p.LEFT, p.TOP);
  p.text(text, 0, 0);
  p.pop();
}

function drawWrappedLine(p: p5, text: string, x: number, y: number, width: number, size: number, leading: number, overlap = 0) {
  const lines = wrapChineseText(p, text, width);
  for (const [index, line] of lines.entries()) {
    p.push();
    p.translate(x + jitterDet(7, overlap, index), y + index * leading);
    p.rotate(jitterDet(0.06, overlap, index + 12));
    p.text(line, 0, 0);
    p.pop();
  }
  return y + lines.length * leading + size * 0.2;
}

function drawPoeticWordField(
  p: p5,
  words: string[],
  x: number,
  y: number,
  width: number,
  height: number,
  intensity: number,
  mode: "light" | "dense"
) {
  const count = Math.round((mode === "dense" ? 22 : 10) + intensity * 20);
  p.push();
  p.textFont(serifFont);
  p.textAlign(p.CENTER, p.CENTER);
  for (let i = 0; i < count; i += 1) {
    const word = words[i % words.length] || "现场";
    const xx = x + seededUnit(i * 73) * width;
    const yy = y + seededUnit(i * 29) * height;
    const size = 10 + seededUnit(i * 11) * (mode === "dense" ? 12 : 8);
    const vertical = i % 3 === 0;
    p.push();
    p.translate(xx, yy);
    p.rotate(vertical ? Math.PI / 2 : (seededUnit(i * 19) - 0.5) * intensity * 0.38);
    p.textSize(size);
    p.textStyle(i % 5 === 0 ? p.BOLD : p.NORMAL);
    p.fill(0, mode === "dense" ? 78 : 42);
    p.text(word, 0, 0);
    p.pop();
  }
  p.pop();
}

function drawDensityRamp(p: p5, phrases: string[], x: number, y: number, width: number, height: number, intensity: number) {
  p.push();
  drawTextDensityBlock(p, phrases, x, y, width, height, intensity);
  const pool = phrases.flatMap(splitChinesePhrases).filter(Boolean);
  p.textFont(displayFont);
  p.textAlign(p.LEFT, p.TOP);
  p.textStyle(p.BOLD);
  for (let row = 0; row < 24; row += 1) {
    const t = row / 23;
    const yy = y + height * (0.45 + t * 0.52);
    const size = 11 + t * 9;
    p.textSize(size);
    p.fill(0, 80 + t * 160);
    for (let col = 0; col < 6 + t * 8; col += 1) {
      const word = pool[(row + col) % Math.max(1, pool.length)] || "过载";
      p.text(word, x + col * (32 - t * 17), yy + col * (2 - t * 4));
    }
  }
  p.pop();
}

function drawBarcode(p: p5, x: number, y: number, width: number, height: number, intensity: number) {
  p.push();
  p.noStroke();
  p.fill(0);
  let cursor = x;
  let i = 0;
  while (cursor < x + width) {
    const w = 1.5 + (i % 5) * (0.8 + intensity * 0.18);
    p.rect(cursor, y, w, height);
    cursor += w + 2 + (i % 4);
    i += 1;
  }
  p.pop();
}

function drawBlackSlash(p: p5, y: number, intensity: number) {
  p.push();
  p.fill(0);
  p.noStroke();
  p.translate(0, y);
  p.rotate(-0.035);
  p.rect(-8, -10, receiptWidth + 18, 15 + intensity * 15);
  p.pop();
}

function drawGhostText(p: p5, text: string, intensity: number, x: number, y: number) {
  const count = Math.round(intensity * 4);
  for (let i = count; i > 0; i -= 1) {
    p.fill(0, 28 + i * 18);
    p.text(text, x - i * 4, y + i * 4);
  }
}

function drawCurvedSentenceBand(p: p5, phrases: string[], cx: number, cy: number, rx: number, ry: number, intensity: number) {
  const pool = phrases.flatMap((item) => splitChinesePhrases(String(item || ""))).filter(Boolean);
  if (!pool.length) return;
  p.push();
  p.textFont(serifFont);
  p.textAlign(p.CENTER, p.CENTER);
  p.textStyle(p.NORMAL);
  p.textSize(12 + intensity * 2);
  p.fill(0, 120);
  const count = Math.round(18 + intensity * 18);
  for (let i = 0; i < count; i += 1) {
    const t = -Math.PI * 0.9 + (Math.PI * 1.8 * i) / Math.max(1, count - 1);
    const word = pool[i % pool.length];
    p.push();
    p.translate(cx + Math.cos(t) * rx, cy + Math.sin(t) * ry);
    p.rotate(t * 0.45);
    p.text(word, 0, 0);
    p.pop();
  }
  p.pop();
}

function drawTinyAnnotation(p: p5, text: string, x: number, y: number, angle: number, inverted: boolean) {
  p.push();
  p.translate(x, y);
  p.rotate(angle);
  p.textFont(serifFont);
  p.textStyle(inverted ? p.BOLD : p.NORMAL);
  p.textSize(inverted ? 14 : 12);
  p.textAlign(p.LEFT, p.CENTER);
  p.fill(0, inverted ? 180 : 96);
  p.text(squeezeText(text, 8), 0, 0);
  p.pop();
}

function drawWordFaceContour(p: p5, words: string[], cx: number, cy: number, w: number, h: number, intensity: number) {
  p.push();
  p.textFont(serifFont);
  p.textAlign(p.CENTER, p.CENTER);
  p.textStyle(p.NORMAL);
  const count = Math.round(34 + intensity * 32);
  for (let i = 0; i < count; i += 1) {
    const t = (i / count) * Math.PI * 2;
    const word = words[i % words.length] || "检测";
    const wobble = 1 + (seededUnit(i * 31) - 0.5) * 0.12;
    p.push();
    p.translate(cx + Math.cos(t) * (w / 2) * wobble, cy + Math.sin(t) * (h / 2) * wobble);
    p.rotate(t + Math.PI / 2);
    p.textSize(11 + intensity * 4 + (i % 5 === 0 ? 4 : 0));
    p.fill(0, 85 + intensity * 70);
    p.text(word, 0, 0);
    p.pop();
  }
  p.pop();
}

function drawEmotionRain(p: p5, phrases: string[], x: number, y: number, width: number, height: number, intensity: number, pattern: string) {
  const pool = phrases.flatMap(splitChinesePhrases).filter(Boolean);
  const count = Math.round(10 + intensity * 30);
  p.push();
  p.textFont(serifFont);
  p.textAlign(p.CENTER, p.CENTER);
  for (let i = 0; i < count; i += 1) {
    const word = pool[i % Math.max(1, pool.length)] || "无语";
    const xx = x + seededUnit(i * 43) * width;
    const yy = y + seededUnit(i * 83) * height;
    const size = 11 + seededUnit(i * 17) * (10 + intensity * 8);
    p.push();
    p.translate(xx, yy);
    p.rotate(pattern === "breakdown" ? (seededUnit(i * 7) - 0.5) * 1.2 : Math.PI / 2 * (i % 3 === 0 ? 1 : 0));
    p.textSize(size);
    p.textStyle(i % 6 === 0 ? p.BOLD : p.NORMAL);
    p.fill(0, 38 + intensity * 75);
    p.text(word, 0, 0);
    p.pop();
  }
  p.pop();
}

function cleanBigPhrase(text: string) {
  return String(text || "").replace(/\n+/g, " ").replace(/\s+/g, "").slice(0, 26) || "离谱";
}

function splitBigPhrase(text: string): string[] {
  if (text.length <= 4) return [...text];
  if (text.length <= 9) return text.match(/.{1,3}/g) ?? [text];
  return text.match(/.{1,4}/g) ?? [text];
}

function fitTextSize(p: p5, text: string, maxWidth: number, targetHeight: number, min: number, max: number) {
  let size = max;
  p.textFont(displayFont);
  p.textStyle(p.BOLD);
  while (size > min) {
    p.textSize(size);
    if (p.textWidth(text) <= maxWidth && size <= targetHeight) break;
    size -= 2;
  }
  return size;
}

function facePatternType(roastLevel: RoastLevel, data: NormalizedReceiptData) {
  if (roastLevel === "gentle") return /吗|呢|？|\?/.test(data.shortComment) ? "confused" : "smile";
  if (roastLevel === "normal") return "speechless";
  if (roastLevel === "spicy") return /怒|疯|炸|崩|救/.test(data.shortComment) ? "angry" : "disgust";
  return /审|判|处刑|完/.test(data.shortComment) ? "judgement" : "breakdown";
}

function drawTextArc(p: p5, words: string[], cx: number, cy: number, rx: number, ry: number, start: number, end: number, size: number) {
  const safeWords = words.filter(Boolean);
  const count = Math.max(10, Math.round((end - start) * 8));
  p.textFont(serifFont);
  p.textStyle(p.BOLD);
  p.textSize(size);
  for (let i = 0; i < count; i += 1) {
    const t = start + (end - start) * (i / Math.max(1, count - 1));
    const word = safeWords[i % Math.max(1, safeWords.length)] || "检测";
    p.push();
    p.translate(cx + Math.cos(t) * rx, cy + Math.sin(t) * ry);
    p.rotate(t + Math.PI / 2);
    p.text(word, 0, 0);
    p.pop();
  }
}

function drawFaceFeature(p: p5, text: string, x: number, y: number, size: number, angle: number, intensity: number) {
  p.push();
  p.translate(x, y);
  p.rotate(angle);
  p.textAlign(p.CENTER, p.CENTER);
  p.textFont(displayFont);
  p.textStyle(p.BOLD);
  p.textSize(size);
  drawGhostText(p, squeezeText(text, 4), intensity * 0.8, 0, 0);
  p.fill(0);
  p.text(squeezeText(text, 4), 0, 0);
  p.pop();
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function arrayOfStrings(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (typeof value === "string") return splitChinesePhrases(value);
  return [];
}

function splitChinesePhrases(text: string): string[] {
  return String(text || "")
    .split(/[，。！？、；：,.!?;:\n\r|/]+/)
    .flatMap((item) => {
      const clean = item.trim();
      if (!clean) return [];
      if (clean.length <= 7) return [clean];
      const chunks = clean.match(/.{2,6}/g);
      return chunks ?? [clean];
    })
    .filter(Boolean);
}

function compactParagraphs(values: string[]) {
  return values.map((value) => String(value || "").trim()).filter(Boolean);
}

function squeezeText(text: string, maxLength: number) {
  const value = String(text || "").trim();
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function seededUnit(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function jitterDet(range: number, intensity: number, seed: number) {
  return (seededUnit(seed + 101) - 0.5) * range * intensity;
}
