// Publish reviewed adaptations serially; existing applied jobs are never recreated.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareContent, applyPrepared, recipeReviewHash } from '../../scripts/lib/content-production/publish.ts';

const base = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(base, '../..');
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const catalog = read(path.join(base, 'adaptations/catalog.json'));
const cases = read(path.join(base, 'import-plan.json')).cases;
const zh = {
  G01: ['角色弹跳登场', '首帧为空白，角色从左侧进入、弹跳落地，末帧只部分退出；重绘和循环接点可见。'],
  G02: ['周一不想上班', '12 帧中文字“周一不想上班”正确；字幕和人物存在轻微重绘抖动。'],
  'G03-golden-gate': ['金门大桥水粉海报', '逐格中心裁为 3:4；海浪变化可见，桥体和船只存在重绘漂移。'],
  'G03-colosseum': [
    '斗兽场旅行海报',
    '逐格中心裁为 3:4；行人、车辆和鸟在循环边界发生可见复位，建筑细节略有漂移，未达到无缝循环目标。',
  ],
  'G03-fuji': ['富士山旅行海报', '逐格中心裁为 3:4；水面和云层变化可见，景物有轻微重绘漂移。'],
  G04: ['灰色走廊与长臂人偶', '10 帧、5 秒、播放一次。裁去每格 2 像素边线；镜头倾斜与走廊几何为近似绘制的关键帧。'],
  G05: [
    '夏日花园喷水分镜',
    '16 个真实关键帧组成 10 秒静音分镜，171×304 像素，逐格中心裁为 9:16。是低分辨率、低帧率改编，不满足原词的 30fps 视频或配乐要求。',
  ],
  'G06-dwarf': [
    '矮人游戏资产转台',
    '12 个绘制视角近似完整旋转，角度、体积与比例略有变化；没有生成可编辑的真实 3D 模型。',
  ],
  'G06-sword': [
    '石中剑游戏资产转台',
    '12 个绘制视角近似完整旋转，角度与剑石形状略有变化；没有生成可编辑的真实 3D 模型。',
  ],
  'G06-motorbike': [
    '摩托游戏资产转台',
    '12 个绘制视角近似完整旋转，角度、车体细节与比例略有变化；没有生成可编辑的真实 3D 模型。',
  ],
  'G06-cat': ['猫游戏资产转台', '12 个绘制视角近似完整旋转，角度、轮廓与比例略有变化；没有生成可编辑的真实 3D 模型。'],
  G07: ['鲸鱼女仆吃饭：真香', '端碗、夹饭、入口、咀嚼和微笑动作明确，各格“真香！”正确，存在轻微重绘抖动。'],
  G08: ['鲸鱼女仆：下班', '正面、侧面两张参考图按顺序传入；12 帧欢呼挥手与“下班！”字幕正确，人物细节略有变化。'],
  G09: ['篮球扣篮动作', '按 12 格动作表依次重绘；循环时篮球由地面直接复位到手上，缺少捡球过渡。'],
  G10: [
    '藏狐鼓掌：好棒棒',
    '9 帧保留真实透明背景，前爪鼓掌，悬浮字牌“好棒棒”正确。深浅背景检查未见白边；脸部仍有轻微重绘差异，不能视为逐像素锁定。',
  ],
  'G11-joy': ['企鹅：喜', '8 帧展翅小跳，人物有轻微重绘变化。四种情绪分别进行独立生图调用，共享同一来源帖。'],
  'G11-anger': ['企鹅：怒', '8 帧鼓腮跺脚，回到中性首帧时表情有跳变。四种情绪分别进行独立生图调用，共享同一来源帖。'],
  'G11-sorrow': [
    '企鹅：哀',
    '8 帧低头、流泪、擦泪后恢复，大小和线条略有变化。四种情绪分别进行独立生图调用，共享同一来源帖。',
  ],
  'G11-delight': [
    '企鹅：乐',
    '8 帧左右摆动、交替抬翅与脚步舞蹈，复位和轻微重绘可见。四种情绪分别进行独立生图调用，共享同一来源帖。',
  ],
  G12: [
    '原创剑士像素水斩',
    '使用本站原创剑士替代来源角色炭治郎。12 帧出鞘、水刃横扫与收势，水花贴近格边；末帧到首帧姿态有变化，不是完全无缝的游戏素材。',
  ],
  G13: ['动漫角色轻眨眼', '8 帧用不同停留时间形成眨眼节奏；轮廓与头部仍有轻微重绘变化。'],
  G14: [
    'Robin 猫眨眼与落帽',
    '保留生成图前 8 格：看镜头、眨眼、写有 Robin 的帽子落下。后 4 格的跳跃和消失未采用；实际播放一次并停在戴帽状态，不宣称无缝循环。',
  ],
  G15: ['Q 版角色喜悦之舞', '8 帧侧步、举臂、跳跃与落地，人物完整入镜；大小和地面线略有变化。'],
  G16: [
    '法师转杖与火花',
    '12 帧、每帧 100ms，转杖与火花可见；仅一次 GPT Image 制作，没有 low/high/max 等级或成本对比。',
  ],
  G17: ['Johnny Bravo 八位风格舞蹈', '8 帧静音像素舞蹈，不含原帖后配音乐；人物细节略有重绘变化。'],
  G18: [
    '动漫角色点头闭眼',
    '12 帧抬头、快速点头和闭眼恢复，播放一次并保持末帧。第 5 格有绘制的运动模糊，位置略有漂移。',
  ],
  W01: [
    '日常自拍与独立日语消息',
    '用本地名称到文件的映射直接上传 R14，未调用服务端参考图注册。自拍只调用生图一次；日语消息由助手单独编写，未创建定时任务。图片约为 9:16，保留实际尺寸。',
  ],
};
const refLabels = {
  'R08-side': ['Side character view', '角色侧视图'],
  'R09-action': ['Twelve-pose action chart', '十二格动作参考表'],
  R08: ['Front character view', '角色正面图'],
  R10: ['Transparent fox reference', '透明藏狐参考图'],
};
const policy = read(path.join(base, 'generation-policy.json'));
for (const item of catalog) {
  if (item.sourceCase.startsWith('S')) continue; // Published by publish-static-adaptations.mjs.
  if (item.sourceCase.startsWith('G') && !policy.allowComposedGifs) continue;
  const folder = path.join(base, item.folder);
  const definition = read(path.join(folder, 'definition.json'));
  if (fs.existsSync(path.join(root, 'production/applied', `${definition.key}.json`))) continue;
  const state = read(path.join(folder, 'state.json'));
  if (state.status !== 'accepted') throw new Error(`Unreviewed: ${item.unitId}`);
  const sourceCase = cases.find((c) => c.case_id === item.sourceCase);
  const workflow = item.unitId === 'W01';
  const reddit = sourceCase.source_post_id.startsWith('reddit:');
  const encoding = workflow ? null : read(path.join(folder, 'output-encoding.json'));
  const [titleZh, limitationZh] = zh[item.unitId];
  const playEn = encoding?.loop === 0 ? 'repeats indefinitely' : 'plays once';
  const playZh = encoding?.loop === 0 ? '无限循环' : '播放一次';
  const resultEn = workflow
    ? 'One directly uploaded reference, one GPT Image selfie, and a separate assistant-authored Japanese message.'
    : `${encoding.frameCount} frames, ${encoding.durationMs / 1000} seconds, ${encoding.width}×${encoding.height}px; ${playEn}. GPT Image frame-sheet + local GIF encoding.`;
  const resultZh = workflow
    ? '直接上传参考图，单次 GPT Image 自拍生成，另附助手编写的日语消息。'
    : `${encoding.frameCount} 帧，${encoding.durationMs / 1000} 秒，${encoding.width}×${encoding.height} 像素，${playZh}；GPT Image 精灵图逐格裁切并在本地编码为 GIF。`;
  const inputEn = item.references.length
    ? `Upload the ${item.references.length} project-generated reference image(s) in the displayed order (${item.references.join(', ')}), then use the complete adapted prompt.`
    : 'Use the complete adapted prompt without a reference image.';
  const inputZh = item.references.length
    ? `按显示顺序上传 ${item.references.length} 张本站生成的参考图（${item.references.join('、')}），使用完整改编词。`
    : '使用完整改编词，无需参考图。';
  const methodEn = workflow
    ? 'Resolve the reference name to a local image file, upload it directly, and make one image call. Compose the separate message afterward. No provider-side named registry or scheduled task is demonstrated.'
    : `Reuse the archived GPT Image sheet and resample its action to nine frames. Sources with eight poses split one held pose across two encoded frames without adding a new pose; longer sequences select nine chronological poses. Preserve total duration and loop settings. Small source cells are enlarged for display without adding detail. The GIF is composed locally; the image tool returned a still PNG. The source sheet, exact crops, frame delays and first-frame poster are retained in the campaign archive.`;
  const methodZh = workflow
    ? '将参考名称解析为本地文件并直接上传，只调用一次生图，然后单独编写消息。本例未验证服务端命名注册或定时执行。'
    : `复用已生成的 GPT Image 精灵图，统一合成 9 帧：8 姿态素材将一次停留拆成两个编码帧，不新增姿态，较长序列按顺序选取 9 帧。保留总时长与循环设置，小尺寸素材仅放大显示，不增加细节。生图工具返回静态 PNG；GIF 由本地合成。原精灵图、裁切坐标、逐帧时长与首帧封面均保存在批次档案。`;
  const sourceEn = `Adapted by Prompt Seen from [@${sourceCase.author}'s original prompt](${sourceCase.prompt.source_url}). The author labels the source work Image 2.6; this run only establishes the GPT Image family, with no exact model ID. The prompt preserves its submitted language on both page editions. ${reddit ? 'The Reddit score is a saved search-index snapshot, not live likes.' : 'Likes describe the whole source post, shared by variants, and are not engagement for this example.'}`;
  const sourceZh = `由 Prompt Seen 根据 [@${sourceCase.author} 的原词](${sourceCase.prompt.source_url})改编。来源作者称原作品使用 Image 2.6；本次仅确认 GPT Image 家族，精确型号未知。中英文页面保留同一实际提交正文。${reddit ? 'Reddit 得分来自保存的搜索索引快照，并非实时点赞。' : '点赞属于整篇来源帖，同帖变体共享统计对象，不属于本站新作品。'}`;
  const message = workflow ? fs.readFileSync(path.join(folder, 'message-ja.txt'), 'utf8').trim() : null;
  const siblings = catalog.filter((c) => c.sourceCase === item.sourceCase && c.unitId !== item.unitId);
  const related = (language) =>
    siblings.length
      ? '\n\n' +
        (language === 'en' ? 'Variants from the same source post: ' : '同帖变体：') +
        siblings.map((s) => (language === 'en' ? s.titleEn : zh[s.unitId][0])).join(' · ')
      : '';
  const recipe = {
    candidateId: definition.candidateId,
    slug: `adapted-${item.unitId.toLowerCase()}-${workflow ? 'selfie-workflow' : 'nine-frame-composed-gif'}`,
    categoryId: workflow ? 'portrait' : item.sourceCase === 'G03' ? 'poster' : 'illustration',
    useCaseIds: ['social-post'],
    body: definition.prompt,
    promptLanguage: item.language,
    promptProvenance: 'independent-adaptation',
    source: { author: 'Prompt Seen (adaptation)', url: sourceCase.prompt.source_url, license: null },
    fields: [],
    values: {},
    inputRequirements: {
      referenceImage: item.references.length ? 'required' : 'none',
      instructions: { en: inputEn, 'zh-Hans': inputZh },
      slots: definition.references.map((r, i) => ({
        id: r.slotId,
        labels: {
          en: refLabels[item.references[i]]?.[0] ?? 'Project-generated character reference',
          'zh-Hans': refLabels[item.references[i]]?.[1] ?? '本站生成的角色参考图',
        },
        min: 1,
        max: 1,
      })),
    },
    inspirationSources: [
      {
        candidateId: definition.candidateId,
        platform: reddit ? 'Reddit' : 'X',
        author: sourceCase.author,
        url: sourceCase.prompt.source_url,
        publishedAt: null,
        metricObjectUrl: sourceCase.source_url,
        metricObjectPublishedAt: null,
        metricScope: {
          en: 'Whole original post; shared across variants, not this adaptation',
          'zh-Hans': '原帖整组统计；同帖变体共享，不属于本改编作品',
        },
        observedAt: sourceCase.metric_observed_date,
        cacheTimestampKnown: false,
        evidenceMethod: {
          en: reddit
            ? 'Saved research report and search-index score snapshot'
            : 'Archived public X snapshot and complete author prompt',
          'zh-Hans': reddit ? '保存的调研报告及搜索索引得分快照' : '归档的 X 公开快照与完整作者原词',
        },
        evidenceUrl: reddit
          ? sourceCase.source_url
          : `https://cdn.syndication.twimg.com/tweet-result?id=${sourceCase.source_post_id}&lang=en&token=1`,
        sourcePromptStatus: {
          en: 'Independent adaptation; full original preserved separately',
          'zh-Hans': '独立改编；完整原词另存档案',
        },
        metrics: [
          {
            key: reddit ? 'score' : 'likes',
            value: reddit ? sourceCase.source_score_search_snapshot : sourceCase.source_likes,
            labels: {
              en: reddit ? 'Search-index score snapshot' : 'Source post likes',
              'zh-Hans': reddit ? '搜索索引得分快照' : '原帖点赞',
            },
          },
        ],
      },
    ],
    locales: {
      en: {
        title: `${item.titleEn} — ${workflow ? 'workflow adaptation' : 'composed GIF'}`,
        description: resultEn,
        body: `## How to use\n\n${inputEn}\n\n${methodEn}\n\n## Result and limitations\n\n${resultEn}\n\n${state.review.notes}${message ? '\n\nSeparate assistant-authored message:\n\n> ' + message : ''}\n\n## Source\n\n${sourceEn}${related('en')}`,
      },
      'zh-Hans': {
        title: `${titleZh} · ${workflow ? '工作流改编' : '合成 GIF'}`,
        description: resultZh,
        body: `## 使用方法\n\n${inputZh}\n\n${methodZh}\n\n## 结果与限制\n\n${resultZh}\n\n${workflow ? limitationZh : '原始素材审核说明（以下帧数和尺寸指原始版本；当前交付统一为 9 帧）：' + limitationZh}${message ? '\n\n助手单独编写的日语消息：\n\n> ' + message : ''}\n\n## 来源\n\n${sourceZh}${related('zh-Hans')}`,
      },
    },
    alt: { en: item.titleEn, 'zh-Hans': titleZh },
  };
  recipe.editorialReview = {
    reviewer: 'Codex',
    reviewedAt: new Date().toISOString(),
    contentHash: recipeReviewHash(recipe),
  };
  fs.writeFileSync(path.join(folder, 'recipe.json'), JSON.stringify(recipe, null, 2) + '\n');
  const prepared = await prepareContent(
    root,
    path.join(root, '.artifacts/content-production', path.basename(base), 'jobs'),
    definition.key,
    recipe,
  );
  const ids = await applyPrepared(root, definition.key, prepared.planHash);
  console.log(JSON.stringify({ unitId: item.unitId, ...ids }));
}
