import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const CAMPAIGN = 'gpt-image-26-gif-2026-11-19-v2';
const cases = Array.from({ length: 30 }, (_, i) => i + 1).filter((n) => n !== 16);
const campaignDir = path.join(ROOT, 'production', CAMPAIGN);
const outputDir = path.join(campaignDir, 'generation', 'outputs');
const refDir = path.join(campaignDir, 'generation', 'references');
const receiptDir = path.join(campaignDir, 'generation', 'receipts');
const jobDir = path.join(campaignDir, 'job-definitions');
const recipeDir = path.join(campaignDir, 'recipes');
for (const d of [outputDir, refDir, receiptDir, jobDir, recipeDir]) fs.mkdirSync(d, { recursive: true });

const envText = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
const apiKey = envText
  .split(/\r?\n/)
  .find((line) => line.startsWith('OPENAI_API_KEY='))
  ?.slice(15)
  .replace(/^"|"$/g, '')
  .trim();
if (!apiKey) throw new Error('OPENAI_API_KEY missing from .env');

const report = fs.readFileSync(path.join(ROOT, 'docs/research/gpt-image-2.6-gif-top30-2026-11-18/REPORT.md'), 'utf8');
const table = new Map();
for (const line of report.split(/\r?\n/)) {
  const m = /^\| (\d+) \| (.*?) \| (.*?) \| (.*?) \| (.*?) \|$/.exec(line);
  if (m) table.set(Number(m[1]), { effect: m[2], signal: m[3], input: m[4], status: m[5] });
}
const sections = new Map();
const headingMatches = [...report.matchAll(/^#### #(\d+) .*?\n/gm)];
for (let i = 0; i < headingMatches.length; i++) {
  const match = headingMatches[i];
  const start = match.index + match[0].length;
  const end = i + 1 < headingMatches.length ? headingMatches[i + 1].index : report.length;
  sections.set(Number(match[1]), report.slice(start, end));
}
const prompts = new Map();
for (const [n, text] of sections) {
  prompts.set(
    n,
    [...text.matchAll(/```text\n([\s\S]*?)\n```/g)].map((m) => m[1].trim()),
  );
}

const sources = {
  chatcut: 'https://chatcut.io/blog/chatgpt-gif',
  chatcutTests: 'https://chatcut.io/blog/gpt-image-2-6',
  reddit7: 'https://www.reddit.com/r/ChatGPT/comments/1xu03hs/7_gif_prompts_i_tested_on_gpt_image_26_the_model/',
  redditDoodle:
    'https://www.reddit.com/r/ChatGPTPromptGenius/comments/1xtuo8d/step_by_step_turn_a_20second_doodle_into_a/',
  redditCrt: 'https://www.reddit.com/r/ChatGPT/comments/1xunvoi/is_chatgpt_gifs_just_distilled_sora_2/',
  imagine: 'https://www.imagine.art/insights/gpt-image-2-6-overview',
};
const candidateId = (n) => `gpt26-gif-${String(n).padStart(2, '0')}-v2`;
const titleMap = {
  1: 'Green frog typing loop',
  2: '16-bit golden retriever thumbs-up',
  3: 'Transparent clay star hop',
  4: 'Transparent SHIP IT badge',
  5: 'MORNING ROAST coffee steam',
  6: 'Earbuds case pulsing LED',
  7: 'Transparent three-pill loader',
  8: 'Paper airplane loader',
  9: 'EMBER flame logo loop',
  10: 'Transparent compass needle loop',
  11: 'Rainy window and puddle ripples',
  12: 'Snowy campfire and embers',
  13: 'Brass metronome swing loop',
  14: 'Raccoon production outage reaction',
  15: 'Rainy neon diner cinemagraph',
  16: 'ON AIR studio meter pulse',
  17: 'Transparent SIDE A cassette sticker',
  18: 'Pet head tilt and blink',
  19: 'Sunglasses reaction loop',
  20: 'Chibi wave and thumbs-up sticker',
  21: 'Product 360-degree turntable',
  22: 'Product shine and sparkles',
  23: 'Hand-drawn character comes alive',
  24: 'Cinemagraph local motion',
  25: 'Mushroom chat pet blink',
  26: 'Mushpie flying through clouds',
  27: 'CRT retro game intro',
  28: 'CRT alpha adventure loop',
  29: 'CRT space-flight game loop',
  30: 'Cassette spools 12-frame loop',
};
const zhMap = {
  1: '绿树蛙眼镜快速打字',
  2: '16-bit 金毛双点赞',
  3: '透明黏土星星跳跃',
  4: '透明 SHIP IT 徽章',
  5: 'MORNING ROAST 咖啡蒸汽',
  6: '耳机盒状态灯脉冲',
  7: '透明三圆点加载动画',
  8: '纸飞机空状态加载动画',
  9: 'EMBER 火焰标志循环',
  10: '透明指南针指针循环',
  11: '雨夜窗口与水坑涟漪',
  12: '雪林篝火与余烬',
  13: '黄铜节拍器摆锤循环',
  14: '浣熊生产事故反应图',
  15: '雨窗霓虹餐馆人像',
  16: 'ON AIR 录音室电平表脉冲',
  17: '透明 SIDE A 磁带贴纸',
  18: '宠物歪头眨眼',
  19: '墨镜反应循环',
  20: 'Q 版挥手比赞贴纸',
  21: '产品 360 度转台循环',
  22: '产品扫光与闪光',
  23: '手绘角色眨眼动作',
  24: '局部环境运动 Cinemagraph',
  25: '蘑菇聊天宠物眨眼',
  26: 'Mushpie 云层飞行',
  27: 'CRT 复古游戏开场',
  28: 'CRT 早期冒险游戏循环',
  29: 'CRT 太空飞行游戏循环',
  30: '磁带卷轴 12 帧循环',
};
const descriptionMap = {
  1: 'A green tree frog in glasses types quickly, flashes a lens and returns to the starting hand position.',
  2: 'A 16-bit sunglasses-wearing golden retriever gives two thumbs-up as pixel stars pop and disappear.',
  3: 'A transparent 3D clay star hops and lands back in its original position.',
  4: 'A transparent “SHIP IT!” street badge rocks from side to side.',
  5: 'Steam rises beside a “MORNING ROAST” coffee bag and loops back.',
  6: 'A wireless earbuds case LED pulses from dim to bright and back.',
  7: 'Three transparent UI loader dots hop in sequence.',
  8: 'A coral paper airplane floats above clouds in an empty-state loader.',
  9: 'The copper flame above the EMBER logo flickers.',
  10: 'A transparent teal compass needle swings and returns to north.',
  11: 'Rain, streetlamp reflections and puddle ripples loop at a rainy window.',
  12: 'A snowy forest campfire and embers flicker smoothly across 16 frames.',
  13: "A brass metronome swings left and right and returns to 12 o'clock.",
  14: 'A startled raccoon with a top caption reacts to a production outage.',
  15: 'Neon reflections move across a rainy diner window while the reader stays still.',
  16: 'The red ON AIR neon sign and four-bar studio meter pulse.',
  17: 'A transparent SIDE A cassette sticker rotates its reels and emits music notes.',
  18: 'A pet tilts its head, blinks and returns to the starting pose.',
  19: 'A person puts on sunglasses, nods and removes them.',
  20: 'A person becomes a chibi sticker, waves, gives a thumbs-up and resets.',
  21: 'A product rotates a full 360 degrees on a turntable.',
  22: 'A light band sweeps across a product with small sparkles while the label stays still.',
  23: 'A hand-drawn character blinks and makes a small friendly movement.',
  24: 'A cinemagraph moves only a small natural element such as steam, water, rain or leaves.',
  25: 'A mushroom chat pet smiles and blinks.',
  26: 'Mushpie, a mushroom chat pet, flies through clouds.',
  27: 'A low-quality CRT recording shows a fictional retro game intro.',
  28: 'A low-quality CRT recording shows a fictional early-3D adventure game loop.',
  29: 'A low-quality CRT recording shows a fictional low-poly space-flight game loop.',
  30: 'A 12-frame cassette loop keeps the label and shell stable while the reels move.',
};
const frameMap = {
  1: [8, 110],
  2: [8, 140],
  3: [8, 150],
  4: [8, 160],
  5: [9, 200],
  6: [9, 180],
  7: [8, 120],
  8: [8, 150],
  9: [8, 180],
  10: [8, 150],
  11: [9, 180],
  12: [16, 120],
  13: [9, 160],
  14: [8, 180],
  15: [9, 180],
  16: [9, 180],
  17: [8, 150],
  18: [9, 200],
  19: [9, 200],
  20: [9, 200],
  21: [9, 200],
  22: [9, 200],
  23: [9, 200],
  24: [9, 200],
  25: [9, 200],
  26: [9, 200],
  27: [8, 160],
  28: [8, 160],
  29: [8, 160],
  30: [12, 160],
};
const transparent = new Set([3, 4, 7, 10, 17]);
const sunburst = new Set([4, 5, 9, 13, 14, 15, 30]);
const refPrompt = {
  18: 'A synthetic golden retriever puppy sitting attentively on a wooden floor in a softly lit living room, collar visible, front-facing, natural smartphone photo, stable background, no text.',
  19: 'A synthetic adult portrait, front-facing neutral expression, simple dark everyday clothing, hands visible near the face, plain indoor background, natural phone-camera lighting, no text.',
  20: 'A synthetic adult portrait wearing round glasses and a casual blue jacket, front-facing, hands visible, plain light-gray background, natural phone-camera lighting, no text.',
  21: 'A single unbranded reusable ceramic travel cup centered on a matte light-gray turntable, front three-quarter view, even studio light, clean background, no logo or text.',
  22: 'A single unbranded amber glass perfume bottle with a brushed brass cap on dark stone, simple studio backdrop, soft side light, no text or logo.',
  23: 'A scanned black-and-white hand-drawn character on cream paper, visible pencil texture, centered full body, clean margins, no added color, no text.',
  24: 'A quiet synthetic rainy apartment window scene at dusk, a potted fern in the foreground, wet glass with soft streetlamp reflections, fixed composition, no people, no text.',
};

function sourceFor(n) {
  if (n <= 15)
    return {
      platform: 'ChatCut',
      author: 'ChatCut',
      url: sources.chatcut,
      candidateId: `gpt26-gif-${String(n).padStart(2, '0')}`,
    };
  if (n <= 17)
    return {
      platform: 'ChatCut',
      author: 'ChatCut',
      url: sources.chatcutTests,
      candidateId: `gpt26-gif-${String(n).padStart(2, '0')}`,
    };
  if (n <= 24)
    return {
      platform: 'Reddit',
      author: 'Reddit r/ChatGPT',
      url: sources.reddit7,
      candidateId: `gpt26-gif-${String(n).padStart(2, '0')}`,
    };
  if (n <= 26)
    return {
      platform: 'Reddit',
      author: 'Reddit r/ChatGPTPromptGenius',
      url: sources.redditDoodle,
      candidateId: `gpt26-gif-${String(n).padStart(2, '0')}`,
    };
  if (n <= 29)
    return {
      platform: 'Reddit',
      author: 'Reddit r/ChatGPT',
      url: sources.redditCrt,
      candidateId: `gpt26-gif-${String(n).padStart(2, '0')}`,
    };
  return { platform: 'ImagineArt', author: 'ImagineArt', url: sources.imagine, candidateId: 'gpt26-gif-30' };
}

function directPrompt(n) {
  if (n === 25)
    return 'A cute green mushroom chat pet with a shiny cap, pink cheeks, big friendly eyes and a small green scarf smiles and blinks once, then returns to its starting pose. Create a clean seamless looping GIF, fixed camera, simple pale background, no text.';
  if (n === 26)
    return 'A cute green mushroom chat pet named Mushpie flies happily through a bright blue sky with white clouds and distant mountains below. Keep the shiny green cap, pink cheeks, friendly closed-eye smile and green scarf consistent across frames. Make a short seamless looping GIF with fixed camera and no text.';
  if (n === 27)
    return 'Low-quality GIF of a fictional retro console startup animation filmed from an old phone pointed at a CRT television. Show abstract low-poly shapes, scanlines, soft focus, muted colors and a short 8-frame loop. No named characters, no recognizable franchise, no audio and no captions.';
  if (n === 28)
    return 'Low-quality CRT capture GIF of a fictional early-3D exploration demo filmed from an old phone pointed at a television. Use rough geometric terrain, simple abstract props, scanlines, muted colors and one short looping camera move. No named characters, no recognizable franchise, no audio and no text overlay.';
  if (n === 29)
    return 'Low-quality CRT capture GIF of a fictional low-poly space-flight demo filmed from an old phone pointed at a television. Keep an abstract cockpit, stars and polygonal spacecraft stable while the camera makes one short loopable movement. No named characters, no recognizable franchise, no audio and no captions.';
  return prompts.get(n)?.[0] ?? table.get(n)?.effect ?? titleMap[n];
}

function sourceRecord(n) {
  const s = sourceFor(n);
  const sourcePromptStatus =
    n >= 18 && n <= 24
      ? { en: 'Original public prompt reviewed.', 'zh-Hans': '已核对公开原始提示词。' }
      : n === 28 || n === 29
        ? { en: 'Reverse-engineered from a public visual variant.', 'zh-Hans': '根据公开视觉变体反推。' }
        : {
            en: 'Public prompt or visual case reviewed; independently adapted.',
            'zh-Hans': '已核对公开提示词或视觉案例；本例为独立改写。',
          };
  return {
    candidateId: s.candidateId,
    platform: s.platform,
    author: s.author,
    url: s.url,
    publishedAt: null,
    metricObjectUrl: s.url,
    metricObjectPublishedAt: null,
    metricScope: {
      en: 'Source metrics do not measure this new generated output.',
      'zh-Hans': '来源指标不代表本次新生成成品。',
    },
    observedAt: '2026-11-19',
    cacheTimestampKnown: false,
    evidenceMethod: {
      en: 'Public source page and generated output reviewed.',
      'zh-Hans': '已核对公开来源页面与生成输出。',
    },
    evidenceUrl: s.url,
    sourcePromptStatus,
    metrics: [],
  };
}

async function postJson(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const t = await r.text();
  let x;
  try {
    x = JSON.parse(t);
  } catch {
    throw new Error(`${url} returned invalid JSON ${t.slice(0, 200)}`);
  }
  if (!r.ok || x.error) throw new Error(`${url} ${r.status}: ${x.error?.message ?? t.slice(0, 200)}`);
  return x;
}
async function editGif(file, item) {
  const form = new FormData();
  form.append('model', item.model);
  form.append('image', new Blob([fs.readFileSync(file)], { type: 'image/png' }), path.basename(file));
  form.append('prompt', item.prompt);
  form.append('output_format', 'gif');
  form.append('size', item.size);
  form.append('quality', item.quality);
  form.append('frame_count', String(item.frames));
  form.append('frame_duration_ms', String(item.duration));
  form.append('background', item.background);
  const r = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const t = await r.text();
  let x;
  try {
    x = JSON.parse(t);
  } catch {
    throw new Error(`edits returned invalid JSON ${t.slice(0, 200)}`);
  }
  if (!r.ok || x.error) throw new Error(`edits ${r.status}: ${x.error?.message ?? t.slice(0, 200)}`);
  return x;
}
async function generate(n) {
  const item = {
    n,
    prompt: directPrompt(n),
    frames: frameMap[n][0],
    duration: frameMap[n][1],
    size: n === 5 ? '768x960' : n === 12 ? '768x432' : new Set([6, 11, 13, 15, 16]).has(n) ? '1024x576' : '768x768',
    model: sunburst.has(n) ? 'gpt-image-2.6-sunburst' : 'gpt-image-2.6-flare',
    quality: sunburst.has(n) ? 'medium' : 'low',
    background: transparent.has(n) ? 'transparent' : 'opaque',
  };
  const out = path.join(outputDir, `g${String(n).padStart(2, '0')}.gif`);
  const receipt = path.join(receiptDir, `g${String(n).padStart(2, '0')}.json`);
  if (fs.existsSync(out) && fs.existsSync(receipt)) return item;
  let data;
  if (refPrompt[n]) {
    const ref = path.join(refDir, `g${String(n).padStart(2, '0')}.png`);
    if (!fs.existsSync(ref)) {
      const base = await postJson('https://api.openai.com/v1/images/generations', {
        model: 'gpt-image-2.6-sunburst',
        prompt: refPrompt[n],
        output_format: 'png',
        size: '1024x1024',
        quality: 'medium',
        n: 1,
      });
      fs.writeFileSync(ref, Buffer.from(base.data[0].b64_json, 'base64'));
    }
    data = await editGif(ref, item);
  } else
    data = await postJson('https://api.openai.com/v1/images/generations', {
      model: item.model,
      prompt: item.prompt,
      output_format: 'gif',
      size: item.size,
      quality: item.quality,
      frame_count: item.frames,
      frame_duration_ms: item.duration,
      background: item.background,
      n: 1,
    });
  fs.writeFileSync(out, Buffer.from(data.data[0].b64_json, 'base64'));
  fs.writeFileSync(
    receipt,
    JSON.stringify(
      {
        model: item.model,
        frames: item.frames,
        duration: item.duration,
        size: item.size,
        output_format: 'gif',
        generationId: data.data[0].generation_id ?? null,
        usage: data.usage ?? null,
      },
      null,
      2,
    ),
  );
  return item;
}
function run(args) {
  execFileSync('node', ['--import', 'tsx', 'scripts/content-produce.ts', ...args], {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  });
}
function makeRecipe(n, item) {
  const src = sourceRecord(n);
  const slug = `gpt26-gif-${String(n).padStart(2, '0')}-${titleMap[n]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 55)}`;
  const refs = refPrompt[n]
    ? [{ slotId: 'reference', path: path.join(refDir, `g${String(n).padStart(2, '0')}.png`) }]
    : [];
  const input = refPrompt[n]
    ? {
        referenceImage: 'required',
        instructions: {
          en: 'Upload the project-generated reference image shown with this case before using the prompt.',
          'zh-Hans': '使用本案例附带的本站生成参考图后再提交提示词。',
        },
        slots: [
          {
            id: 'reference',
            labels: { en: 'Project-generated synthetic reference', 'zh-Hans': '本站生成的合成参考图' },
            min: 1,
            max: 1,
          },
        ],
      }
    : { referenceImage: 'none', instructions: {}, slots: [] };
  const observedEn = descriptionMap[n];
  const recipe = {
    candidateId: candidateId(n),
    slug,
    categoryId: 'illustration',
    useCaseIds: ['social-post'],
    body: item.prompt,
    promptLanguage: 'en',
    promptProvenance: n >= 18 && n <= 24 ? 'source-prompt' : 'independent-adaptation',
    source: { author: src.author, url: src.url, license: null },
    fields: [],
    values: {},
    inputRequirements: input,
    inspirationSources: [src],
    locales: {
      en: {
        title: titleMap[n],
        description: observedEn,
        body: `## How to use\n\n${refPrompt[n] ? 'Upload the project-generated reference image shown with this case, then use the exact recorded prompt.' : 'Use the exact recorded prompt. No reference image is required.'}\n\n## Observed result\n\n${observedEn} Generated with GPT Image 2.6 through the OpenAI Image API as a native animated GIF with ${item.frames} frames at ${item.duration} ms per frame.\n\n## Source and generation\n\nThis case is a Prompt Seen reproduction or adaptation of the linked public prompt research source. The source interaction does not measure this new generated output.`,
      },
      'zh-Hans': {
        title: zhMap[n],
        description: zhMap[n],
        body: `## 使用方法\n\n${refPrompt[n] ? '上传本案例附带的本站生成参考图，再使用本次实际提交的完整提示词。' : '无需参考图，直接使用本次实际提交的完整提示词。'}\n\n## 观察结果\n\n${zhMap[n]} 通过 OpenAI Image API 使用 GPT Image 2.6 生成原生 GIF，共 ${item.frames} 帧，每帧 ${item.duration} 毫秒。\n\n## 来源与生成\n\n本例是 Prompt Seen 根据公开提示词研究来源生成或改编的案例。来源互动数不代表本次新生成成品。`,
      },
    },
    alt: { en: observedEn, 'zh-Hans': zhMap[n] },
  };
  const rp = path.join(recipeDir, `${recipe.candidateId}.json`);
  fs.writeFileSync(rp, JSON.stringify(recipe, null, 2));
  return {
    recipePath: rp,
    refs,
    outputPath: path.join(outputDir, `g${String(n).padStart(2, '0')}.gif`),
    jobPath: path.join(jobDir, `${recipe.candidateId}.json`),
    candidateId: recipe.candidateId,
  };
}
async function main() {
  fs.writeFileSync(
    path.join(campaignDir, 'README.md'),
    '# GPT Image 2.6 GIF API generation campaign\n\nGenerated with the OpenAI Image API on 2026-11-19 and imported through content:produce.\n',
  );
  fs.writeFileSync(
    path.join(campaignDir, 'campaign.json'),
    JSON.stringify(
      {
        cases: cases.map((n) => ({
          candidateId: candidateId(n),
          expectedOutputs: 1,
          acceptedExampleIds: [],
        })),
      },
      null,
      2,
    ),
  );
  let next = 1;
  async function worker() {
    while (true) {
      const index = next++;
      if (index > cases.length) return;
      const n = cases[index - 1];
      await generate(n);
      console.log(`generated ${index}/${cases.length}`);
    }
  }
  await Promise.all([worker(), worker()]);
  for (const [index, n] of cases.entries()) {
    const item = {
      n,
      prompt: directPrompt(n),
      frames: frameMap[n][0],
      duration: frameMap[n][1],
      size: n === 5 ? '768x960' : n === 12 ? '768x432' : new Set([6, 11, 13, 15, 16]).has(n) ? '1024x576' : '768x768',
      model: sunburst.has(n) ? 'gpt-image-2.6-sunburst' : 'gpt-image-2.6-flare',
      quality: sunburst.has(n) ? 'medium' : 'low',
      background: transparent.has(n) ? 'transparent' : 'opaque',
    };
    const x = makeRecipe(n, item);
    const def = {
      key: x.candidateId,
      candidateId: x.candidateId,
      prompt: item.prompt,
      references: x.refs,
      targetAspectRatio: null,
    };
    const statusFile = path.join(ROOT, '.artifacts/content-production', CAMPAIGN, 'jobs', x.candidateId, 'job.json');
    if (!fs.existsSync(statusFile)) {
      fs.writeFileSync(x.jobPath, JSON.stringify(def, null, 2));
      run(['plan', '--campaign', CAMPAIGN, '--file', x.jobPath]);
      run(['claim', '--campaign', CAMPAIGN, '--key', x.candidateId]);
      const rec = path.join(receiptDir, `${x.candidateId}-record.json`);
      fs.writeFileSync(
        rec,
        JSON.stringify({ outputPath: x.outputPath, provider: 'OpenAI API', model: item.model }, null, 2),
      );
      run(['record', '--campaign', CAMPAIGN, '--key', x.candidateId, '--file', rec]);
      const review = path.join(receiptDir, `${x.candidateId}-review.json`);
      fs.writeFileSync(
        review,
        JSON.stringify(
          {
            accepted: false,
            reviewer: 'Pending visual review',
            notes:
              'Visual review is required before accepting pixels, specified text, reference roles and display variants.',
          },
          null,
          2,
        ),
      );
      run(['review', '--campaign', CAMPAIGN, '--key', x.candidateId, '--file', review]);
    }
    const preparedFile = path.join(ROOT, '.artifacts/content-production/prepared', x.candidateId, 'prepared.json');
    if (process.env.GPT26_SKIP_PREPARE !== '1' && !fs.existsSync(preparedFile))
      run(['prepare', '--campaign', CAMPAIGN, '--key', x.candidateId, '--file', x.recipePath]);
    if (process.env.GPT26_SKIP_APPLY !== '1') {
      const prepared = JSON.parse(fs.readFileSync(preparedFile, 'utf8'));
      run(['apply', '--campaign', CAMPAIGN, '--key', x.candidateId, '--hash', prepared.planHash]);
    }
    console.log(
      `${process.env.GPT26_SKIP_APPLY === '1' ? (process.env.GPT26_SKIP_PREPARE === '1' ? 'recorded' : 'prepared') : 'imported'} ${index + 1}/${cases.length}`,
    );
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
