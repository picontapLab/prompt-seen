raise SystemExit('Legacy preparation is archived. Use prepare-nine-frame.mjs for the authorized nine-frame campaign.')
"""Prepare separately attributed frame-sheet adaptations. Never generate or publish."""
import json
from pathlib import Path
BASE = Path(__file__).resolve().parent
policy_file = BASE/'generation-policy.json'
if policy_file.exists() and not json.loads(policy_file.read_text())['allowComposedGifs']:
 raise SystemExit('User requested native GIFs only; frame-sheet adaptation preparation is disabled.')
plan = json.loads((BASE/'import-plan.json').read_text())
cases = {c['case_id']: c for c in plan['cases']}
manifest = json.loads((BASE/'sources/manifest-v3.json').read_text())
# IDs, English title, frame grid, delays, playback count. GIF loop 0 is infinite, 1 plays once.
settings = {
 'G01': ('Bouncing character entrance',4,2,[250]*8,0),
 'G02': ('Monday reaction sticker',4,3,[200]*12,0),
 'G03-golden-gate': ('Golden Gate gouache waves',4,2,[250]*8,0),
 'G03-colosseum': ('Colosseum travel poster',4,2,[250]*8,0),
 'G03-fuji': ('Mount Fuji travel poster',4,2,[250]*8,0),
 'G04': ('Gray hallway encounter',5,2,[500]*10,1),
 'G05': ('Summer garden water montage',4,4,[620,630]*8,1),
 'G06-dwarf': ('Dwarf game asset turntable',4,3,[120]*12,0),
 'G06-sword': ('Sword in stone turntable',4,3,[120]*12,0),
 'G06-motorbike': ('Motorbike game asset turntable',4,3,[120]*12,0),
 'G06-cat': ('Cat game asset turntable',4,3,[120]*12,0),
 'G07': ('Whale maid enjoys rice',4,2,[250]*8,0),
 'G08': ('Whale maid after work',4,3,[200]*12,0),
 'G09': ('Basketball dunk sequence',4,3,[150]*12,0),
 'G10': ('Deadpan Tibetan fox applause',3,3,[200]*9,0),
 'G11-joy': ('Penguin joy',4,2,[200]*8,0),
 'G11-anger': ('Penguin anger',4,2,[200]*8,0),
 'G11-sorrow': ('Penguin sorrow',4,2,[200]*8,0),
 'G11-delight': ('Penguin delight',4,2,[200]*8,0),
 'G12': ('Swordsman pixel water strike',4,3,[150]*12,0),
 'G13': ('Gentle anime blink',4,2,[700,90,70,100,70,90,300,580],0),
 'G14': ('Robin cat wink and falling hat',4,3,[200]*12,0),
 'G15': ('Chibi dance of joy',4,2,[150]*8,0),
 'G16': ('Wizard staff spin and sparkles',4,3,[100]*12,0),
 'G17': ('Johnny Bravo eight-bit dance',4,2,[100]*8,0),
 'G18': ('Anime nod and closed eyes',4,3,[150]*12,1),
}
extras = {
 'G01':'1コマ目は人物がまだ画面の外、2～4コマ目で左から弾んで入る、5～6コマ目は中央で可愛く着地、7～8コマ目で右へ出て空白に戻る。',
 'G02':'动作从抱着公文包困倦站立，到缓缓瘫坐，再勉强站起。每格顶部原样写“周一不想上班”，文字位置和字形相同。',
 'G04':'The 10 chronological views must be: approach distant doorway; approach closer; long-armed mannequin appears; camera whips right; camera tilts 45 degrees; camera lies 90 degrees sideways; figure approaches; figure passes close; figure passes beyond; empty tilted hallway. Never reset the ending. No frame numbers or labels.',
 'G05':'只制作16个真实关键姿态组成的10秒静音分镜GIF改编版，非30fps视频。按原分镜8个阶段，每阶段两个连续关键帧；最后水花覆盖镜头。人物必须是22岁成人，完整泳装、罩衫、短裤保持一致。不画文字。',
 'G07':'8格动作：端碗、夹饭、抬筷、送入口、咀嚼、满足微笑、再夹饭、回到端碗。每格顶部固定准确中文“真香！”。',
 'G08':'主题是终于下班，开心地挥手。顶部字幕严格固定为“下班！”。12格动作从疲惫低头到抬头、欢呼、摆尾挥手，再回到起点。',
 'G09':'遵循输入动作表的12个动作顺序，固定角色大小、地面线和篮筐位置。不能把动作表本身画在某一格里。每格只有完整场景的一帧。',
 'G10':"The exact floating text in every cell is '好棒棒'. Nine poses show the front paws slowly approaching, touching, separating, and returning. Keep the fox face and half-closed eyes absolutely unchanged. Preserve true transparent pixels, including the gap under the floating sign.",
 'G11-joy':'今回の感情は「喜」。8コマで嬉しく両翼を広げて小さく跳び、着地して最初の姿勢へ戻る。文字不要。',
 'G11-anger':'今回の感情は「怒」。8コマで頬を膨らませ、片足ずつ地団駄を踏み、怒った姿勢へ戻る。文字不要。',
 'G11-sorrow':'今回の感情は「哀」。8コマで肩を落として涙が一粒流れ、翼で拭いて最初へ戻る。文字不要。',
 'G11-delight':'今回の感情は「楽」。8コマで笑顔で左右に揺れながら翼を交互に上げる楽しいダンス、最初へ戻る。文字不要。',
 'G12':'Use the project-original swordsman in the reference, not an existing anime character. Across 12 cells show ready, windup, water-edged sword sweep, flowing follow-through, then ready. Pixel edges, stable ground line, no text.',
 'G14':"12 karede: Robin kameraya bakar; tek gözünü kırpar; tekrar açar; yukarıdan üzerinde tam olarak 'Robin' yazan küçük yeşil şapka iner; başına konar; sonra hafifçe yukarı sıçrayıp kadraj dışına çıkar ve ilk duruma döner. Şapka üzerindeki yazı dışında hiçbir yazı veya kare numarası yok.",
 'G15':'8コマで左右のステップ、腕を上げる、体をひねる、小さく跳ぶ、着地、元の姿勢。全身と足元をすべてのコマに収める。',
 'G16':'Exactly twelve distinct chronological poses: staff rotates in the hand through a full turn over frames 1–8, sparkles appear at 9–10, fade at 11, ready pose at 12. No timecodes, no numbers, no written text.',
 'G17':'A single muscular adult Johnny Bravo in a black tee, blue jeans, sunglasses and tall blond pompadour. Eight different pixel poses: left step, arm pump, right step, arm pump, hips left, hips right, crouch bounce, starting stance. Fixed white background, no writing.',
 'G18':'Twelve consecutive poses: frames 1–4 slowly tilt the head upward; 5–6 quickly nod downward; 7–10 recover to normal head position while the eyelids close; 11–12 settle with eyes fully closed. Play once, retain the final closed-eye pose. No writing.',
}
refs = {'G01':['R05'],'G02':['R06'],'G05':['R07'],'G07':['R08'],'G08':['R08','R08-side'],'G09':['R09-action'],'G10':['R10'],'G11':['R11'],'G12':['R12'],'G13':['R15'],'G14':['R16'],'G15':['R17'],'G16':['R18'],'G18':['R19']}
items=[]
for uid,(title,cols,rows,delays,loop) in settings.items():
 cid=uid.split('-')[0]; case=cases[cid]; lang=case['prompt']['language']
 sid='G11' if cid=='G11' else uid
 source=(BASE/'sources'/sid/'source-prompt.txt').read_text()
 if (BASE/'drafts'/cid/'prompt.txt').exists(): source=(BASE/'drafts'/cid/'prompt.txt').read_text()
 n=len(delays)
 if lang=='ja':
  adapter=f'\n\n【制作適応：今回の出力】上記は動きの意図です。この呼び出しではGIFファイルではなく、横{cols}列×縦{rows}行、合計{n}コマの単一PNGスプライトシートだけを描いてください。左上から右へ、次に下の段へ進む順序。各コマは同じ正方形で、区切り線、余白、番号、時刻、文字は不要。固定カメラ、固定の大きさと地面線、十分な余白、コマ間でキャラクターの同一性を維持し、実際に異なる連続動作を描く。純白背景。後で各コマを切り出してGIFにします。'
 elif lang=='zh-Hans':
  adapter=f'\n\n【制作适配：本次输出】上文只定义动作和造型。本次只输出一张PNG精灵图，严格{cols}列×{rows}行，共{n}格，左到右、上到下按时间排列，每格同样大小。不是GIF文件。不要边框、格线、边距、序号、时间码；除指定字幕外不要新增文字。所有格固定机位、角色大小、地面基线和配色，角色和动作不超出单格。连续帧有清晰不同的姿态，之后逐格编码为GIF。'
 elif lang=='tr':
  adapter=f'\n\nÜretim uyarlaması: Bu çağrıda GIF değil, {cols} sütun ve {rows} satırdan oluşan tek PNG sprite sayfası üret. Toplam {n} eşit kare, zaman sırası soldan sağa ve üstten alta. Kenarlık, ayraç çizgisi, boş oluk, zaman etiketi veya kare numarası yok. Sabit kamera, aynı karakter boyutu, aynı arka plan ve renkler. Her karede gerçek ve farklı ardışık hareket. Kareler daha sonra GIF olarak kodlanacak.'
 else:
  aspect='portrait 3:4' if cid=='G03' else 'square'
  adapter=f'\n\nProduction adaptation: The text above defines the visual idea and action. For this call output only ONE PNG SPRITE SHEET, NOT a GIF file: exactly {cols} columns by {rows} rows, {n} equal {aspect} cells, chronological row-major order. No border, grid lines, gutters, frame numbers, timestamps, or extra text. Fixed camera and ground line unless the action explicitly moves the camera. Keep scale, character identity, palette and geometry consistent; each cell is one distinctly different consecutive animation pose with nothing crossing cell boundaries. Cells will be extracted and encoded locally afterward.'
 if cid=='G06': adapter+=' Show twelve successive views at 0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300 and 330 degrees. Lock the camera, floor, pivot and light; rotate the object itself. No writing.'
 if loop==0 and lang=='en':adapter+=' Make the motion return naturally from the final cell to the first.'
 prompt=source+adapter+'\n'+extras.get(uid,extras.get(cid,''))
 folder=BASE/'adaptations'/uid.lower(); folder.mkdir(parents=True,exist_ok=True)
 reference_ids=refs.get(cid,[])
 definition={'key':f'gpt26-social-{uid.lower()}-adapted-v1','candidateId':f'gpt26-social-{uid.lower()}-adapted','prompt':prompt,'references':[{'slotId':f'reference{i+1}','path':str(BASE/'references'/r/'output.png')} for i,r in enumerate(reference_ids)],'targetAspectRatio':None}
 if not (folder/'definition.json').exists():
  (folder/'definition.json').write_text(json.dumps(definition,ensure_ascii=False,indent=2)+'\n')
  (folder/'prompt.txt').write_text(prompt)
  (folder/'animation.json').write_text(json.dumps({'columns':cols,'rows':rows,'frameCount':n,'delays':delays,'loop':loop,'sourceCase':cid,'sourceUnit':sid,'provenance':'independent-adaptation','requireTransparency':cid=='G10'},indent=2)+'\n')
 items.append({'unitId':uid,'sourceCase':cid,'sourceUnit':sid,'language':lang,'titleEn':title,'titleZh':case['title']+(' · '+uid.split('-')[-1] if '-' in uid else ''),'folder':str(folder.relative_to(BASE)),'references':reference_ids})
# Preserve separately prepared workflow entries when refreshing animation definitions.
catalog_file = BASE/'adaptations/catalog.json'
if catalog_file.exists():
 items.extend(i for i in json.loads(catalog_file.read_text()) if i['unitId'] not in settings)
(BASE/'adaptations/catalog.json').write_text(json.dumps(items,ensure_ascii=False,indent=2)+'\n')
print(f'Prepared {len(items)} separately attributed animation adaptations')
