"""Project-authored reference prompts, distinct from all collected source prompts."""
import json
from pathlib import Path
BASE=Path(__file__).resolve().parent
prompts={
'R05':'アニメーション用のオリジナル成人女性キャラクターを一人描いてください。24歳の女性をかわいい三頭身のちびキャラにしたデザイン。栗色のショートボブ、丸い赤い髪留め、黄色いパーカー、赤い膝丈スカート、白いスニーカー。正面全身、自然な立ち姿、両手両足と靴と髪飾りが全部見える。きれいな太めの輪郭線、フラットな色、純白背景、四周に十分な余白。文字、ロゴ、影の強い背景、他の人物、コマ割り不要。',
'R06':'生成一个原创成年Q版草帽冒险者全身参考角色。三头身，卷曲深棕短发，圆眼睛，戴带蓝色帽带的浅黄草帽，橙色背心、浅蓝衬衫、棕色短裤和系带短靴，腰间一个小帆布包。友好表情，正面自然站姿，双手双脚清楚，整体轮廓稳定，所有物件不裁切。干净插画、清楚黑色轮廓、平涂配色，白底，四周充足留白。无文字、无品牌、无其他角色、不是多格图。',
'R07':'一张原创22岁成年东亚女性的全身服装参考照。短深棕波波头与轻薄刘海，穿完整蓝色连体泳装，外罩黄色镂空针织罩衫，搭配完整的蓝色牛仔短裤。自然站姿，双手放松于身体两侧，神态轻松。均匀柔和的自然光，中性浅灰摄影背景，全身及双脚完整入镜，服装结构清楚。真实自然肤质，正常成年人比例，不夸张身材，无文字，无水印，无其他人物。',
'R08':'创建原创Q版蓝白鲸鱼主题女仆角色正面全身参考图：蓝色渐变长发、呆毛、鲸鱼耳鳍、蓝色蝴蝶结、白色女仆头饰、完整蓝白女仆裙和身后的大鲸鱼尾巴。三头身大头小身体，圆脸、大眼睛，可爱但服装完整保守。清晰线稿和平涂配色，站立双手自然放在两侧，双脚、尾巴、头饰全部完整入镜，纯白背景，四周有留白，无字无logo无多格。',
'R09':'生成一个原创成年Q版篮球运动员的全身参考图：深棕肤色、黑色短卷发、绿色无字篮球背心和短裤、白色运动鞋，右手持一个标准橙色篮球。三头身，运动比例，友好自信神情，正面自然站立。干净深色描边和平涂色块，人物、双手、鞋和篮球全部完整，纯白背景，四周充足空白。不要文字、号码、logo、篮筐或多格。',
'R10':'Create one original semi-realistic natural-history illustration of a seated Tibetan fox, full body, front view. Sandy ochre fur, extremely wide square boxy head, narrow half-closed unimpressed eyes and deadpan expression. Both front paws clearly visible and separated, ready for a slow clap. Soft fine fur detail with clean readable silhouette. True transparent background, no white background, no outline, no sticker border. No sign, no words, no props. Leave generous transparent space above the head and around all paws and tail.',
'R11':'オリジナルのかわいいペンギンのマスコットを一羽、正面全身で描く。黒紺の頭と背中、白い丸い顔とお腹、小さなオレンジのくちばしと足、丸い黒い目、首に小さな赤いマフラー。短い左右の翼がよく見える、落ち着いた立ち姿。単純で安定した輪郭、はっきりした色、やさしい太い線、純白背景、上下左右に余白。文字、記号、他のキャラクター、コマ割りは不要。',
'R12':'Draw a project-original adult fantasy swordsman as one full-body character reference, not an existing anime character. Short dark teal hair tied in a small ponytail, amber eyes, navy tunic and trousers, pale aqua wave-patterned sleeveless haori, brown sash and sandals, and one sheathed curved sword with a turquoise guard held at the waist. Calm determined expression, front three-quarter standing pose, both hands and feet visible. Crisp anime line art and flat colors, pure white background, generous margins. No text, no logo, no sprite grid. The later animation will convert this original character to pixel art and a water-themed strike.',
'R14':'一人のオリジナル成人女性キャラクターの正面胸像。25歳、肩までの黒髪、柔らかな茶色の目、自然な表情。ベージュのカーディガンと白い丸首シャツ。清潔で繊細なアニメ線画と落ち着いた淡い色。頭頂、髪、両肩が全部見える。明るい無地の背景で余白を十分に取り、文字やロゴやスマートフォンは描かない。後で同一人物の日常の自撮りを作るための参照画像。',
'R17':'喜びのダンス用のオリジナル成人男性のちびキャラを一人、正面全身で描いてください。25歳、明るいオレンジ色の短い髪、丸い眼鏡、青いオーバーオール、白いTシャツ、黄色いスニーカー。三頭身、やさしい笑顔、両腕を少し広げる立ち姿。両手と足と頭の全部が見える。明瞭な輪郭線、平涂り、純白背景、四周に十分な余白。文字、ロゴ、追加人物、コマ割りは不要。',
'R19':'Create one original adult anime woman, age 24, as a bust reference for a nodding animation. Brown hair in two neat round buns with short loose bangs, warm brown eyes both fully open, a soft small smile, cream blouse with a simple green collar. Straight head, front-facing view, entire head and neck clearly visible with generous headroom. Clean consistent anime outlines, flat soft colors, plain pale cream background. No text, no logo, no animation cells.',
}
for rid,prompt in prompts.items():
 folder=BASE/'references'/rid;folder.mkdir(parents=True,exist_ok=True)
 definition={'key':f'gpt26-social-{rid.lower()}-v1','candidateId':f'gpt26-social-{rid.lower()}','prompt':prompt,'references':[],'targetAspectRatio':None}
 if not (folder/'definition.json').exists():
  (folder/'definition.json').write_text(json.dumps(definition,ensure_ascii=False,indent=2)+'\n');(folder/'prompt.txt').write_text(prompt)
print(f'Prepared {len(prompts)} reference jobs; derived side/action views follow their inputs.')
