import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareContent, applyPrepared, recipeReviewHash } from '../../scripts/lib/content-production/publish.ts';
const base = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(base, '../..');
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const copy = {
  S01: {
    en: [
      'High-angle bedroom selfie in everyday clothes',
      'A high-angle bedroom selfie with a blue shirt, beige trousers and white sneakers.',
      'Keeps the bedroom and raised-arm viewpoint; replaces the original fitted crop top, shorts, heels and body emphasis with everyday clothing.',
    ],
    zh: [
      '卧室俯拍自拍 · 日常着装改编',
      '蓝衬衫、米色长裤与白色运动鞋的卧室俯拍自拍。',
      '保留卧室及举臂俯拍视角，将原词中的紧身短上衣、短裤、高跟鞋及身形强调改为日常着装。',
    ],
    ja: [
      '日常着の寝室俯瞰セルフィー',
      '青いシャツ、ベージュのパンツ、白いスニーカーで撮る寝室の俯瞰セルフィー。',
      '寝室と腕を上げた俯瞰視点を残し、元の体形を強調する短いトップス、ショートパンツ、ハイヒールを日常着に変更しています。',
    ],
    notesJa:
      '高い視点からの成人の日常的な寝室セルフィー。伸ばした腕、不透明な青いシャツ、ベージュのパンツ、白い靴が両方見えます。木の床、クリーム色のカーテン、白いベッドが改編文に沿っています。自然な遠近感があり、体形を強調する演出はありません。原文の再現ではなく独自アレンジです。',
  },
  S04: {
    en: [
      'Nighttime windshield portrait with a city map',
      'Two adults read a city map in the rear seat, seen through the windshield at night.',
      'Keeps the exterior windshield viewpoint, beige car interior and warm night lighting. Replaces the forward-leaning pose with two upright seated adults reading a map. The map is illustrative texture, not usable navigation.',
    ],
    zh: [
      '挡风玻璃夜景人像 · 地图场景改编',
      '夜晚透过前挡风玻璃，拍摄后排两位成年人查看城市地图。',
      '保留车外挡风玻璃视角、米色内饰和温暖夜间光线，将前倾姿势改为两位成年人端坐读地图。地图仅为画面纹理，不可用于导航。',
    ],
    ja: [
      'フロントガラス越しの夜景と地図',
      '夜の車内で地図を見る後部座席の成人2人を、フロントガラス越しに撮影。',
      '車外からの視点、ベージュの車内、暖かな夜の光を保ち、前かがみの姿勢を成人2人が座って地図を見る場面に変更しています。地図は描写用の模様で、案内には使えません。',
    ],
    notesJa:
      '駐車した車の後部座席に服を着た成人2人が端正に座り、女性が折り畳み地図を見ています。ガラス、ボンネット、ミラー、手前のヘッドレストで車外からの視点が分かります。暖かな車内と夜のぼけが明確です。地図は読める案内資料ではなく画面の模様です。書き直した独立の場面です。',
  },
  S11: {
    en: [
      'Moonlit lakeside portrait in an opaque hanfu robe',
      'An adult woman in a full moon-white robe sits by a misty lake under cool moonlight.',
      'Keeps the moonlit lake, willow silhouettes and traditional clothing. Replaces translucent fitted fabric and the leaning pose with an opaque full-length robe and hands resting on the lap; omits the original author watermark.',
    ],
    zh: [
      '月夜湖畔汉服 · 端坐长袍改编',
      '成年女性身穿月白长袍，端坐雾气笼罩的湖边，沐浴冷色月光。',
      '保留月夜湖面、柳树和传统服饰，将半透明贴身衣料及后仰姿势改为不透光长袍、双手置膝端坐；不使用原作者水印。',
    ],
    ja: [
      '月夜の湖畔と不透明な漢服の長衣',
      '月白色の長衣を着た成人女性が、霧の湖畔に座り冷たい月光を浴びる肖像。',
      '月夜の湖、柳、伝統的な衣装を残し、半透明で体に沿う布と後ろに傾く姿勢を、不透明な長衣と膝に手を置く座り姿に変更しています。元作者の透かしは入れていません。',
    ],
    notesJa:
      '成人女性が淡い緑の交差襟を持つ不透明な月白色の長衣を着て、湖畔の岩に座り膝に手を置いています。月、柳、霧、冷たい湖面の反射が見えます。布が脚と足首を覆い、元作者の透かしはありません。衣装、姿勢、透かしを意図的に原文から変更した作品です。',
  },
  S14: {
    en: [
      'Mirrored elevator portrait in a tailored suit',
      'A woman in a black suit holds sunglasses beside her reflection in a mirrored elevator.',
      'Keeps the elevator, mirror, sunglasses and subtle Keor detail. Replaces the crop top, mini skirt and stockings with a black suit, ivory blouse and flats. This is not a model-version comparison.',
    ],
    zh: [
      '镜面电梯人像 · 西装改编',
      '女性穿黑色西装，手持墨镜，在电梯镜面前看向自己的倒影。',
      '保留电梯、镜面、墨镜和小型 Keor 细节，将短上衣、迷你裙及长袜改为黑色西装、象牙白上衣和平底鞋，不制作模型版本对照。',
    ],
    ja: [
      'スーツ姿のエレベーター鏡像ポートレート',
      '黒いスーツの女性がサングラスを持ち、エレベーターの鏡に映る自分を見る肖像。',
      'エレベーター、鏡、サングラス、小さなKeorの文字を残し、短いトップス、ミニスカート、ストッキングを黒いスーツ、アイボリーのブラウス、フラットシューズに変更しています。モデル間の比較ではありません。',
    ],
    notesJa:
      '成人が黒いスーツ、アイボリーのブラウス、フラットシューズでエレベーターに立ち、サングラスを持って一つの自然な鏡像を見ています。袖のKeorは判読でき、階数表示は6です。衣装全体と靴が見えます。日常のファッションへの改編であり、原文の肌を露出する衣装の再現やモデル比較は主張しません。',
  },
};
const catalog = read(path.join(base, 'adaptations/catalog.json'));
for (const [id, text] of Object.entries(copy)) {
  const relative = `adaptations/${id.toLowerCase()}-still-v1`,
    folder = path.join(base, relative);
  const definition = read(path.join(folder, 'definition.json')),
    state = read(path.join(folder, 'state.json'));
  if (state.status !== 'accepted') throw new Error(`Unreviewed ${id}`);
  const original = read(path.join(base, 'recipes', id.toLowerCase() + '-original.json'));
  const source = original.inspirationSources[0];
  const recipe = {
    ...original,
    candidateId: definition.candidateId,
    slug: `adapted-${id.toLowerCase()}-everyday-portrait`,
    body: definition.prompt,
    promptProvenance: 'independent-adaptation',
    source: { author: 'Prompt Seen (adaptation)', url: source.url, license: null },
    inputRequirements: {
      referenceImage: 'none',
      instructions: {
        en: 'Use the complete rewritten prompt without an input image.',
        'zh-Hans': '使用完整改编提示词，不需要参考图。',
      },
      slots: [],
    },
    locales: {},
    alt: { en: text.en[1], 'zh-Hans': text.zh[1] },
  };
  recipe.inspirationSources = original.inspirationSources.map((s) => ({
    ...s,
    sourcePromptStatus: {
      en: 'Independent adaptation; original prompt failed three attempts and is archived separately.',
      'zh-Hans': '独立改编；原词三次尝试失败并另行归档。',
    },
  }));
  recipe.locales.en = {
    title: text.en[0] + ' — independent adaptation',
    description: text.en[1],
    body: `## How to use\n\nUse the complete rewritten prompt without an input image.\n\n## Result and changes\n\n${text.en[1]} ${text.en[2]}\n\n${state.review.notes}\n\n## Source and generation\n\nPrompt Seen independently rewrote [@${source.author}'s source prompt](${source.url}) after three original-prompt attempts returned no image. This new output uses the rewritten text shown here; it is not an original-prompt success. The original text and failures remain archived. One new built-in GPT Image call produced this still. Exact model version is unknown. The source author's Image 2.6 claim and whole-post likes describe the original post, not this adaptation. The submitted prompt language stays unchanged across page languages.`,
  };
  recipe.locales['zh-Hans'] = {
    title: text.zh[0],
    description: text.zh[1],
    body: `## 使用方法\n\n使用完整改编提示词，不需要参考图。\n\n## 结果与改动\n\n${text.zh[1]} ${text.zh[2]}\n\n## 来源与生成\n\n由 Prompt Seen 根据 [@${source.author} 的来源提示词](${source.url})独立改写。原词三次尝试均未返回图像；本图使用页面展示的改编词，不算作原词实测成功。完整原词和失败记录另存档案。本图由一次新的内置 GPT Image 调用生成，精确型号未知。原作者的 Image 2.6 声明和整帖点赞仅属于来源帖，不属于本改编。正文保持实际提交语言。`,
  };
  recipe.editorialReview = {
    reviewer: 'Codex',
    reviewedAt: new Date().toISOString(),
    contentHash: recipeReviewHash(recipe),
  };
  fs.writeFileSync(path.join(folder, 'recipe.json'), JSON.stringify(recipe, null, 2) + '\n');
  fs.writeFileSync(
    path.join(folder, 'japanese.json'),
    JSON.stringify(
      {
        title: text.ja[0] + ' — 独自アレンジ',
        description: text.ja[1],
        notes: text.notesJa,
        body: `## 使い方\n\n入力画像なしで、書き直した完全なプロンプトを使用してください。\n\n## 結果と変更点\n\n${text.ja[1]} ${text.ja[2]}\n\n${text.notesJa}\n\n## 出典と生成\n\nPrompt Seenが[@${source.author}の元プロンプト](${source.url})を独自に書き直しました。元の文面による3回の試行は画像を返さなかったため、この作品にはここに掲載する改編文を使っています。原文での成功例ではなく、原文と失敗記録は別途保存しています。内蔵GPT Imageを新たに1回呼び出して生成した静止画で、厳密なモデル名は不明です。元作者のImage 2.6という説明と投稿全体のいいね数は元投稿に属し、本アレンジの実績ではありません。プロンプトは各言語ページでも実際に提出した言語のままです。`,
      },
      null,
      2,
    ) + '\n',
  );
  if (!fs.existsSync(path.join(root, 'production/applied', definition.key + '.json'))) {
    const prepared = await prepareContent(
      root,
      path.join(root, '.artifacts/content-production', path.basename(base), 'jobs'),
      definition.key,
      recipe,
    );
    console.log(JSON.stringify({ id, ...(await applyPrepared(root, definition.key, prepared.planHash)) }));
  }
  if (!catalog.some((i) => i.unitId === id))
    catalog.push({
      unitId: id,
      sourceCase: id,
      sourceUnit: id,
      language: original.promptLanguage,
      titleEn: text.en[0],
      titleZh: text.zh[0],
      folder: relative,
      references: [],
      type: 'independent-static-adaptation',
    });
}
fs.writeFileSync(path.join(base, 'adaptations/catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
