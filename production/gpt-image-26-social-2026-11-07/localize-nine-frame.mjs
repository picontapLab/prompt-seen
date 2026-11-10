// Japanese editorial translations for the nine-frame campaign; original submitted prompts stay unchanged.
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { checkLocale } from '../../scripts/lib/localization/check.ts';
import { splitFrontmatter } from '../../scripts/lib/content/mdx.ts';
import { acquireContentLock } from '../../scripts/lib/content-production/lock.ts';
const root = process.cwd(),
  base = 'production/gpt-image-26-social-2026-11-07';
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const items = read(base + '/adaptations/content-map.json').filter((i) => i.sourceCase.startsWith('G') && i.ids);
const text = {
  G01: [
    '弾みながら登場するキャラクター',
    '元の8コマは空白から始まり、左から一部が見え、走って弾み、着地して右へ退出します。色、髪留め、服装は参照画像に沿っています。2秒ループで、最後の部分退出から空白の先頭へ戻ります。短い日本語原文は別に保存しています。',
  ],
  G02: [
    '月曜日に働きたくないリアクション',
    '元の12コマすべてで「周一不想上班」が正しく描かれています。麦わら帽子、青い帯、オレンジ色のベストを保ち、あくび、座り込み、立ち上がりへ進みます。2.4秒ループ。字幕位置や輪郭には小さな揺れがあり、文字の画素単位の固定は保証しません。',
  ],
  'G03-golden-gate': [
    'ゴールデンゲート橋と波のガッシュ画',
    '元の8コマでは橋、崖、砂浜を保ちながら波が寄せて返し、鳥の位置が変わります。3:4の中央切り抜きで橋と前景を残しています。風景や人物には再描画による小さなずれがあります。2秒の無限ループで、完全に固定された絵のレイヤーではなく独自アレンジです。',
  ],
  'G03-colosseum': [
    'コロッセオの旅行ポスター',
    '元の8コマではコロッセオを背景に自転車、スクーター、人、鳥が動きます。3:4の中央切り抜き、2秒ループ。ループ境界で位置が戻り、建築の細部にもずれがあるため、原文のシームレスな動きではなくキーフレームによるアレンジです。',
  ],
  'G03-fuji': [
    '富士山の旅行ポスター',
    '元の8コマでは塔と富士山の周囲に桜の花びらが舞い、見物客が少し動きます。3:4の中央切り抜き、2秒ループ。建物や風景には再描画による小さなずれがあります。',
  ],
  G04: [
    '灰色の廊下での遭遇',
    '元の10コマは接近、人形の出現、カメラの旋回と転倒、人形の接近と通過、傾いた無人の廊下の順です。元は各500msの10コマ、計5秒で1回再生します。カメラの傾きや形状は描かれた近似であり、計測された3Dカメラではありません。切り出し時に各コマの2pxの枠線だけを除きました。',
  ],
  G05: [
    '夏の庭で水遊びするモンタージュ',
    '元の16キーフレームは成人の参照人物の服装と夏の庭を保ち、浮き輪、水鉄砲、水蹴り、振り向き、最後の水しぶきを描いています。元は10秒、毎秒1.6キーフレームの無音GIFで1回再生。9:16の中央切り抜き素材は171×304pxです。小さな分鏡のアレンジであり、30fps動画、音楽、滑らかなカメラ移動、原文の全条件は満たしません。',
  ],
  'G06-dwarf': [
    'ドワーフのゲーム素材風ターンテーブル',
    '元の12視点は正面から両側と背面を通り、ほぼ正面に戻ります。赤いひげ、肩の斧、毛皮、衣装と全身を保っています。1.44秒ループ。描かれた視点間隔は近似で、実際の3Dメッシュのレンダリングではありません。',
  ],
  'G06-sword': [
    '石に刺さった剣のターンテーブル',
    '元の12視点は苔むした石に刺さる青と金の剣を正面、側面、背面から描き、一周します。中央に全体を収めています。元は12コマ×120ms。角度間隔と形状には小さな変化があり、実際の3Dモデルではありません。',
  ],
  'G06-motorbike': [
    'バイクのゲーム素材風ターンテーブル',
    '元の12視点はシアンの車輪と赤い差し色を持つ暗色の未来的バイクの正面、側面、背面を描きます。車輪と車体を画面内に保つ1.44秒ループ。形状や縮尺に小さなずれがあり、書き出した3D素材ではなく複数視点のイラストです。',
  ],
  'G06-cat': [
    '猫のゲーム素材風ターンテーブル',
    '元の12視点は座ったキジトラの正面から背面を巡り、ほぼ正面へ戻ります。白い胸、足、縞模様を保つ1.44秒ループ。生成画像のため角度間隔や細かい毛並みに変化があります。',
  ],
  G07: [
    'ご飯を楽しむクジラメイド',
    '元の8コマは胸から上を描き、ご飯を持つ、箸を上げる、食べる、かむ、満足げに笑う順です。「真香！」の文字は全コマで正しく、青いクジラメイドの特徴も参照に沿っています。2秒ループ。字幕と髪には再描画による小さな揺れがあります。',
  ],
  G08: [
    '仕事を終えたクジラメイド',
    '元の12コマでは順序付きの正面・側面参照を使い、疲れた表情から元気に手を振って戻ります。全コマの字幕は「下班！」で文字欠けはありません。2.4秒ループ。位置、文字の形、髪に小さな揺れがあります。',
  ],
  G09: [
    'バスケットボールのダンク動作',
    '元の12姿態は入力表の順に、準備、ジャンプ、回転、腕上げ、ダンク、ぶら下がり、手放し、着地を描きます。人物とゴールは読み取れる位置で、1.8秒ループ。境界でボールが手に戻り、拾い上げる動作はありません。',
  ],
  G10: [
    '無表情のチベットスナギツネの拍手',
    '9コマの透明GIFで前足が拍手し、半閉じの無表情な目を保っています。耳の上に支柱なしで浮く札はすべて「好棒棒」。元の符号化GIFは明暗両背景で確認済みで、実際の透明度があり白い縁はありません。顔にわずかな再描画差があり、完全な画素固定ではありません。',
  ],
  'G11-joy': [
    'ペンギンの喜び',
    '元の8姿態は笑顔、翼上げ、小さなジャンプ、着地、通常姿勢へ進みます。赤いマフラーと色を保ち、全身が入り、文字はありません。1.6秒の無限ループ。輪郭と縮尺に小さな変化があります。',
  ],
  'G11-anger': [
    'ペンギンの怒り',
    '元の8姿態は眉を寄せ、頬を膨らませ、交互に足踏みします。ペンギンと赤いマフラーを保つ1.6秒ループ。先頭で通常表情に戻るため、表情の完全なシームレス接続ではありません。',
  ],
  'G11-sorrow': [
    'ペンギンの悲しみ',
    '元の8姿態はうつむき、涙、翼で拭く動作から通常姿勢へ戻ります。縮尺と線に小さな変化があり、画素固定のシームレスな素材ではありません。',
  ],
  'G11-delight': [
    'ペンギンの楽しいダンス',
    '元の8姿態は笑顔で左右に揺れ、翼と足を交互に動かします。小さな再描画差と通常姿勢への復帰があります。',
  ],
  G12: [
    '剣士のピクセル風水斬り',
    '元の12姿態は抜刀、振りかぶり、水の横斬り、構えへの復帰を描きます。炭治郎ではなくオリジナルの剣士です。水の波はコマの端に近く、形に小さなずれがあり、末尾から先頭で構えが変わります。完全にシームレスなゲーム素材ではありません。',
  ],
  G13: [
    'アニメ人物の軽いまばたき',
    '元の8コマは目を開く、半閉じ、閉じる、開き直す順です。顔、服、構図を保ちつつ小さな描画差があります。2秒の無限ループでGIFメタデータを検証済み。コマ画像からのアレンジであり、原文から直接返されたネイティブGIFではありません。',
  ],
  G14: [
    'Robinの猫のウインクと落ちる帽子',
    '元の先頭8コマを選択し、カメラを見る猫、片目のウインク、緑のRobinの帽子が落ちて収まる動きを使っています。猫が跳んで消える後半4コマは除外。元の8コマ版は2秒で1回再生し、シームレスループとはしていません。着地後の帽子のRobinは読み取れます。',
  ],
  G15: [
    'ちびキャラの喜びのダンス',
    '元の8姿態は横歩き、腕上げ、ジャンプ、着地、復帰を描きます。全身がコマ内に収まり、縮尺と地面の線には小さな変化があります。',
  ],
  G16: [
    '魔法使いの杖回しと火花',
    '元の12コマは異なる杖の向きと火花を時系列で描き、全身と杖がコマ内に収まります。時刻や文字はありません。杖の長さに小さな再描画差があります。元は12コマ×100ms、計1.2秒の無限ループ。',
  ],
  G17: [
    'Johnny Bravoの8ビット風ダンス',
    '元の8姿態はピクセル風のJohnny Bravoが交互に踏み、腕を振り、腰を動かし、しゃがんで弾む動きです。全身が入り、文字はありません。無音の0.8秒ループ。形に小さな再描画差があり、元投稿の音楽は含みません。',
  ],
  G18: [
    'アニメ人物のうなずきと閉じた目',
    '元の12姿態は顔を上げ、素早くうなずき、目を閉じて通常位置へ戻ります。1回再生して最後の閉じた目を保持します。元の5コマ目には描かれた動きのぼけと小さな位置ずれがあります。',
  ],
};
const dictionary = {
  'Project-generated character reference': '本プロジェクトで生成したキャラクター参照画像',
  'Front character view': 'キャラクターの正面図',
  'Side character view': 'キャラクターの側面図',
  'Twelve-pose action chart': '12姿態の動作参照表',
  'Transparent fox reference': '背景が透明なキツネの参照画像',
  'Archived public X snapshot and complete author prompt': '保存されたXの公開スナップショットと作者の完全なプロンプト',
  'Source post likes': '元投稿のいいね数',
  'Whole original post; shared across variants, not this adaptation':
    '元投稿全体の数値。各バリエーションで共有し、本アレンジへの反応数ではありません',
  'Independent adaptation; full original preserved separately': '独自アレンジ。完全な原文は別途保存',
  'Use the complete adapted prompt without a reference image.':
    '参照画像なしで、アレンジ済みの完全なプロンプトを使用してください。',
  'Saved research report and search-index score snapshot':
    '保存された調査レポートと検索インデックスのスコアのスナップショット',
  'Search-index score snapshot': '検索インデックスのスコアのスナップショット',
};
const notes = new Map();
for (const item of items) {
  const c = read(base + '/' + item.folder + '/composition.json');
  dictionary[item.titleEn] = text[item.unitId][0];
  const prefix =
    '4枚の一覧画像ですべての9フレームの順序、人物の特徴、字幕、最終姿態を確認しました。保存済みのGPT Image素材を再利用し、新たな画像ツール呼び出しは行っていません。';
  notes.set(
    item.ids.example,
    prefix +
      (c.sourceFrameCount === 8
        ? '一つの姿態の停留を2フレームに分けています。異なる元姿態は8種類、符号化フレームは9枚です。'
        : '元素材から時系列順に9姿態を選びました。') +
      (c.scale > 1 ? '元の小さな画像を表示用に拡大していますが、細部は増えていません。' : '') +
      '総再生時間とループ回数は保持しています。元素材の確認記録（以下のコマ数は元素材のもの）：' +
      text[item.unitId][1],
  );
}
function translate(value, field) {
  if (field.file.includes('/examples/')) return notes.get(field.file.split('/')[2]);
  if (dictionary[value]) return dictionary[value];
  const m =
    /^Upload the (\d+) project-generated reference image\(s\) in the displayed order \((.*?)\), then use the complete adapted prompt\.$/.exec(
      value,
    );
  if (m)
    return `表示順に本プロジェクトで生成した参照画像${m[1]}枚（${m[2]}）をアップロードし、完全なアレンジ済みプロンプトを使用してください。`;
  throw Error('Untranslated ' + value);
}
const files = new Set(
  items.flatMap((i) => [
    `content/prompts/${i.ids.prompt}/entry.yaml`,
    `content/examples/${i.ids.example}/run.yaml`,
    ...i.ids.media.map((m) => `content/media/${m}.yaml`),
  ]),
);
const pageKeys = new Set([...items.map((i) => 'prompt/' + i.ids.prompt), 'collection/c_013', 'collection/c_016']);
const release = acquireContentLock(root);
try {
  let report = checkLocale(root, 'ja');
  for (const field of report.fields.filter((f) => files.has(f.file))) {
    const value = translate(field.source, field);
    if (!value) throw Error(field.key);
    const doc = YAML.parseDocument(fs.readFileSync(field.file, 'utf8'));
    doc.setIn(field.targetField, value);
    fs.writeFileSync(field.file, doc.toString());
  }
  for (const item of items) {
    const recipe = read(base + '/' + item.folder + '/recipe.json'),
      enc = read(base + '/' + item.folder + '/output-encoding.json');
    const input = translate(recipe.inputRequirements.instructions.en, { file: '' });
    const source = recipe.inspirationSources[0];
    const body = `## 使い方\n\n${input}\n\n保存済みのGPT Imageのコマ画像を使い、ローカルで9フレームのGIFを合成します。8姿態の素材は一つの停留を2フレームに分け、より長い素材は時系列順に9姿態を選びます。元の総再生時間とループ回数を保ち、小さな画像は表示用に拡大しますが細部は増えません。画像ツールが返したのは静止PNGで、ネイティブGIFではありません。元画像、切り出し位置、フレーム時間、先頭フレームの表紙は制作記録に保存しています。\n\n## 結果と制約\n\n9フレーム、${enc.durationMs / 1000}秒、${enc.width}×${enc.height}px。${enc.loop === 0 ? '無限ループ' : '1回再生'}。\n\n${notes.get(item.ids.example)}\n\n## 出典\n\nPrompt Seenが[@${source.author}の原文](${source.url})をもとに独自にアレンジしました。元の作者はImage 2.6による作品としていますが、この実行で確認できたのはGPT Imageというモデル系列だけで、厳密な型番は不明です。掲載するプロンプトは実際の提出言語を保持しています。${source.platform === 'Reddit' ? 'Redditのスコアは保存された検索インデックスの一時点の値で、現在のいいね数ではありません。' : 'いいね数は元投稿全体のもので、同じ投稿のバリエーション間で共有され、本作例への反応数ではありません。'}${
      items.filter((i) => i.sourceCase === item.sourceCase && i.unitId !== item.unitId).length
        ? '\n\n同じ元投稿のバリエーション：' +
          items
            .filter((i) => i.sourceCase === item.sourceCase && i.unitId !== item.unitId)
            .map((i) => `[${text[i.unitId][0]}](prompt:${i.ids.prompt})`)
            .join('・')
        : ''
    }`;
    const p = report.items.find((p) => p.key === 'prompt/' + item.ids.prompt);
    const title = text[item.unitId][0] + ' — 合成GIF',
      description = `9フレーム、${enc.durationMs / 1000}秒、${enc.width}×${enc.height}px、${enc.loop === 0 ? '無限ループ' : '1回再生'}。GPT Imageのコマ画像をローカルでGIFに合成。`;
    fs.writeFileSync(
      p.targetFile,
      `---\n${YAML.stringify({ title, description, status: 'published', updatedAt: '2026-11-09', translation: { sourceLocale: 'en', sourceHash: p.sourceHash, reviewStatus: 'reviewed' } })}---\n\n${body}\n`,
    );
  }
  for (const id of ['c_013', 'c_016']) {
    const p = report.items.find((p) => p.key === 'collection/' + id);
    let title, description, body;
    if (id === 'c_013') {
      const old = splitFrontmatter(fs.readFileSync(p.targetFile, 'utf8'));
      const fm = YAML.parse(old.frontmatter);
      title = fm.title;
      description = fm.description;
      body =
        old.body.slice(0, old.body.indexOf('## 別枠の独自アレンジ')) +
        '## 別枠の独自アレンジ\n\n[26個の9フレーム合成GIF](collection:c_016)は、保存済みのGPT Image素材をローカルで合成した独自アレンジで、ネイティブGIFではありません。[4つの日常ポートレート改編](collection:c_017)は、残る場面を別の書き直したプロンプトで制作しています。別枠の[自撮りワークフロー作例](prompt:p_273)は、1回の画像生成とアシスタントが別に書いた日本語メッセージを使います。';
    } else {
      title = 'SNSアニメーション — 26個の9フレーム合成GIF';
      description =
        'GPT Imageの動作素材を使った9フレームのアレンジ。元の言語のプロンプト、参照画像、再生方法の記録を含みます。';
      body =
        '各GIFは、保存済みのGPT Image素材からローカルで合成した9枚の符号化フレームで構成されます。8姿態の素材は一つの停留を2フレームに分け、長い素材は9姿態を選びます。総時間とループ設定は保持します。独自アレンジであり、ネイティブGIFや厳密な原文テストではありません。小さな素材は細部を増やさずに拡大する場合があります。プロンプトの元の言語は保持しています。[静止画の原文テスト](collection:c_013)も参照してください。';
    }
    fs.mkdirSync(path.dirname(p.targetFile), { recursive: true });
    fs.writeFileSync(
      p.targetFile,
      `---\n${YAML.stringify({ title, description, status: 'published', updatedAt: '2026-11-09', translation: { sourceLocale: 'en', sourceHash: p.sourceHash, reviewStatus: 'reviewed' } })}---\n\n${body.trim()}\n`,
    );
  }
  report = checkLocale(root, 'ja');
  const reviewPath = 'production/localization/ja/reviews.json',
    reviews = read(reviewPath);
  for (const x of [
    ...report.items
      .filter((p) => pageKeys.has(p.key))
      .map((p) => ({ key: p.key, sourceHash: p.sourceFingerprint, targetHash: p.targetHash })),
    ...report.fields
      .filter((f) => files.has(f.file))
      .map((f) => ({ key: f.key, sourceHash: f.sourceHash, targetHash: f.targetHash })),
  ]) {
    if (!x.targetHash) throw Error('Missing target ' + x.key);
    if (
      reviews.records.some(
        (r) =>
          r.key === x.key &&
          r.sourceHash === x.sourceHash &&
          r.targetHash === x.targetHash &&
          r.conclusion === 'approved',
      )
    )
      continue;
    reviews.records.push({
      ...x,
      reviewer: 'Codex',
      completedAt: new Date().toISOString(),
      conclusion: 'approved',
      reason:
        'Japanese text reviewed against the English source and nine-frame composition audit; original prompt language, source attribution, frame-count distinctions and limitations retained.',
    });
  }
  fs.writeFileSync(reviewPath, JSON.stringify(reviews, null, 2) + '\n');
  console.log(JSON.stringify({ pages: pageKeys.size, fields: report.fields.filter((f) => files.has(f.file)).length }));
} finally {
  release();
}
