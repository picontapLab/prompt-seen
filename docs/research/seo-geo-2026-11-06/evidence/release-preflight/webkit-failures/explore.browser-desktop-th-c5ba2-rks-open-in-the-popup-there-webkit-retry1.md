# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: explore.browser.spec.ts >> desktop >> the list links to explore with its conditions, and works open in the popup there
- Location: tests/e2e/explore.browser.spec.ts:108:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: Test timeout of 30000ms exceeded.
Call log:
  - navigating to "http://127.0.0.1:8090/en/prompts/#style=ink", waiting until "load"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2]:
    - /url: "#main"
  - banner [ref=e3]:
    - generic [ref=e4]:
      - link "Prompt Seen home" [ref=e5]:
        - /url: /
        - generic [ref=e8]: PROMPT SEEN
      - navigation "Main" [ref=e9]:
        - list [ref=e10]:
          - listitem [ref=e11]:
            - link "Prompts" [ref=e12]:
              - /url: /en/prompts/
          - listitem [ref=e13]:
            - link "Templates" [ref=e14]:
              - /url: /en/templates/
          - listitem [ref=e15]:
            - link "Collections" [ref=e16]:
              - /url: /en/collections/
      - generic [ref=e17]:
        - link "Search" [ref=e18] [cursor=pointer]:
          - /url: /en/search/
          - generic [ref=e19]:
            - generic [ref=e23]: Search
            - generic [aria-hidden] [ref=e24]: /
        - link "Saved" [ref=e25] [cursor=pointer]:
          - /url: /en/favorites/
          - generic [aria-hidden] [ref=e29]: Saved
        - 'button "Language: English" [ref=e32] [cursor=pointer]':
          - generic [ref=e33]:
            - generic [ref=e34]: "Language:"
            - text: English
        - link "Prompt Seen on GitHub" [ref=e38]:
          - /url: https://github.com/picontapLab/prompt-seen
        - button "Switch to dark theme" [ref=e41] [cursor=pointer]
  - main [ref=e47]:
    - generic [ref=e48]:
      - generic [ref=e49]:
        - generic [ref=e50]:
          - heading "The roll" [level=1] [ref=e51]
          - paragraph [ref=e53]: Every prompt we have tested, newest first, each printed with the frame it produced. Point at a work to read how its prompt opens; open it for the whole prompt, the test record and what each phrase does.
        - paragraph [ref=e54]:
          - text: 231 frames
          - generic [ref=e55]: · Page 1 of 10
      - generic [ref=e57]:
        - region [ref=e59]:
          - heading "This week's picks" [level=2] [ref=e60]
          - generic [ref=e61]:
            - figure [ref=e63]:
              - generic [ref=e64]:
                - generic [ref=e65]:
                  - img "One product photo becomes nine coordinated campaign compositions." [ref=e67]
                  - generic [aria-hidden]:
                    - generic: A
                    - generic: B
                - generic [ref=e68]:
                  - generic [ref=e69]: "0123"
                  - heading "3x3 product campaign from one reference photo" [level=3] [ref=e70]
                  - generic [ref=e71]: GPT Image 2.5 · Oct 29, 2026
              - generic [ref=e72]:
                - blockquote [ref=e73]:
                  - text: "Using the uploaded product photo, design a 3-by-3 campaign contact sheet. Keep the container, label and brand palette consistent across all nine panels. Use this campaign palette: sage green, ivory and brushed silver. In reading order the nine panels show: hero shot;"
                  - button "cap and label close-up A" [ref=e74] [cursor=pointer]
                  - text: ; hand holding the bottle; brushed metal detail;
                  - button "three-bottle repeated arrangement B" [ref=e75] [cursor=pointer]
                  - text: ; floating bottle; paint texture macro; bottle beside leaves; bottle on a picnic table.…
                - paragraph [aria-hidden] [ref=e76]
                - region [ref=e77]:
                  - heading "What each phrase does" [level=2] [ref=e78]
                  - list [ref=e79]:
                    - listitem:
                      - generic [aria-hidden] [ref=e80]: A
                      - generic [ref=e81]: cap and label close-up The second panel reserves space for the cap texture and readable PINE mark.
                    - listitem:
                      - generic [aria-hidden] [ref=e82]: B
                      - generic [ref=e83]: three-bottle repeated arrangement Repeating the same product establishes a coherent campaign rhythm.
                - generic [ref=e84]:
                  - generic [ref=e85]:
                    - button "Copy prompt" [ref=e86] [cursor=pointer]
                    - status [ref=e93]
                  - link "Open frame" [ref=e94]:
                    - /url: /en/prompts/product-brand-story-grid/
            - generic [ref=e97]:
              - generic [ref=e98]:
                - link "Sixteen emotions become a consistent character sticker sheet with short Chinese captions. by GPT Image 2.5 0146 Chinese character sticker sheet GPT Image 2.5 · 1:1 · Oct 29" [ref=e99]:
                  - /url: /en/prompts/character-chinese-sticker-sheet/
                  - generic [ref=e100]:
                    - img "Sixteen emotions become a consistent character sticker sheet with short Chinese captions." [ref=e101]
                    - generic: by GPT Image 2.5
                  - generic [ref=e102]:
                    - generic [ref=e103]: "0146"
                    - generic [ref=e104]: Chinese character sticker sheet
                  - generic [ref=e105]: GPT Image 2.5 · 1:1 · Oct 29
                - button "Save" [ref=e108] [cursor=pointer]
              - generic [ref=e113]:
                - link "A miniature alpine valley inside a crystal sphere, with a waterfall flowing across an oak table. by GPT Image 2.5 0101 Crystal sphere waterfall GPT Image 2.5 · 1312:1199 · Oct 29" [ref=e114]:
                  - /url: /en/prompts/crystal-sphere-waterfall/
                  - generic [ref=e115]:
                    - img "A miniature alpine valley inside a crystal sphere, with a waterfall flowing across an oak table." [ref=e116]
                    - generic: by GPT Image 2.5
                  - generic [ref=e117]:
                    - generic [ref=e118]: "0101"
                    - generic [ref=e119]: Crystal sphere waterfall
                  - generic [ref=e120]: GPT Image 2.5 · 1312:1199 · Oct 29
                - button "Save" [ref=e123] [cursor=pointer]
        - generic [ref=e129]:
          - group "Style" [ref=e131]:
            - button "All 231" [pressed] [ref=e132] [cursor=pointer]
            - button "Ink wash 8" [ref=e133] [cursor=pointer]
            - button "Flat vector 45" [ref=e134] [cursor=pointer]
            - button "Bauhaus 8" [ref=e135] [cursor=pointer]
            - button "Neon 9" [ref=e136] [cursor=pointer]
            - button "Minimal 33" [ref=e137] [cursor=pointer]
            - button "Gradient 9" [ref=e138] [cursor=pointer]
            - button "Geometric 11" [ref=e139] [cursor=pointer]
            - button "Cyanotype 1" [ref=e140] [cursor=pointer]
          - generic [ref=e141]:
            - button "Use · Shape" [ref=e142] [cursor=pointer]
            - link "Explore" [ref=e145] [cursor=pointer]:
              - /url: /en/explore/
            - generic [ref=e150]:
              - generic: Sort
              - button "Newest first Sort" [ref=e152] [cursor=pointer]:
                - generic [ref=e153]: Newest first
        - generic [ref=e157]:
          - link "Skip the list" [ref=e158]:
            - /url: "#_R_1minpfeiumivb_"
          - feed "Prompts" [ref=e160]:
            - article [ref=e161]:
              - link "Pencil owl blinks and lifts its wings while remaining a drawing on the notebook page. GIF by GPT Image 2.6 0235 Animated notebook owl GPT Image 2.6 · 1:1 · Nov 4" [ref=e162]:
                - /url: /en/prompts/image26-g12-animated-notebook-owl/
                - generic [ref=e163]:
                  - img "Pencil owl blinks and lifts its wings while remaining a drawing on the notebook page." [ref=e164]
                  - generic:
                    - generic: GIF
                    - generic: by GPT Image 2.6
                - generic [ref=e165]:
                  - generic [ref=e166]: "0235"
                  - generic [ref=e167]: Animated notebook owl
                - generic [ref=e168]: GPT Image 2.6 · 1:1 · Nov 4
              - button "Save" [ref=e171] [cursor=pointer]
            - article [ref=e176]:
              - link "Pelican and red bicycle preserve the sunset reference. GIF by GPT Image 2.6 0234 Cycling pelican loop GPT Image 2.6 · 1:1 · Nov 4" [ref=e177]:
                - /url: /en/prompts/image26-g11-cycling-pelican-loop/
                - generic [ref=e178]:
                  - img "Pelican and red bicycle preserve the sunset reference." [ref=e179]
                  - generic:
                    - generic: GIF
                    - generic: by GPT Image 2.6
                - generic [ref=e180]:
                  - generic [ref=e181]: "0234"
                  - generic [ref=e182]: Cycling pelican loop
                - generic [ref=e183]: GPT Image 2.6 · 1:1 · Nov 4
              - button "Save" [ref=e186] [cursor=pointer]
            - article [ref=e191]:
              - link "Green and orange robots retain their left-right positions and identities while stepping, waving and bringing hands together. GIF by GPT Image 2.6 0233 Two dancing robots GPT Image 2.6 · 1:1 · Nov 4" [ref=e192]:
                - /url: /en/prompts/image26-g10-two-dancing-robots/
                - generic [ref=e193]:
                  - img "Green and orange robots retain their left-right positions and identities while stepping, waving and bringing hands together." [ref=e194]
                  - generic:
                    - generic: GIF
                    - generic: by GPT Image 2.6
                - generic [ref=e195]:
                  - generic [ref=e196]: "0233"
                  - generic [ref=e197]: Two dancing robots
                - generic [ref=e198]: GPT Image 2.6 · 1:1 · Nov 4
              - button "Save" [ref=e201] [cursor=pointer]
            - article [ref=e206]:
              - link "A female adult gymnast shows crouch, takeoff, tucked rotation and landing across six poses. GIF by GPT Image 2.6 0232 Standing backflip loop GPT Image 2.6 · 1:1 · Nov 4" [ref=e207]:
                - /url: /en/prompts/image26-g09-standing-backflip-loop/
                - generic [ref=e208]:
                  - img "A female adult gymnast shows crouch, takeoff, tucked rotation and landing across six poses." [ref=e209]
                  - generic:
                    - generic: GIF
                    - generic: by GPT Image 2.6
                - generic [ref=e210]:
                  - generic [ref=e211]: "0232"
                  - generic [ref=e212]: Standing backflip loop
                - generic [ref=e213]: GPT Image 2.6 · 1:1 · Nov 4
              - button "Save" [ref=e216] [cursor=pointer]
            - article [ref=e221]:
              - link "Original round fish retains its yellow hat, mint body and coral fins. GIF by GPT Image 2.6 0231 Round fish reaction loop GPT Image 2.6 · 1:1 · Nov 4" [ref=e222]:
                - /url: /en/prompts/image26-g08-round-fish-reaction-loop/
                - generic [ref=e223]:
                  - img "Original round fish retains its yellow hat, mint body and coral fins." [ref=e224]
                  - generic:
                    - generic: GIF
                    - generic: by GPT Image 2.6
                - generic [ref=e225]:
                  - generic [ref=e226]: "0231"
                  - generic [ref=e227]: Round fish reaction loop
                - generic [ref=e228]: GPT Image 2.6 · 1:1 · Nov 4
              - button "Save" [ref=e231] [cursor=pointer]
            - article [ref=e236]:
              - link "Four family members remain around the same dinner table as the father lifts food and the mother nods. GIF by GPT Image 2.6 0230 Family dinner in China in 2005 GPT Image 2.6 · 1:1 · Nov 4" [ref=e237]:
                - /url: /en/prompts/image26-g07-family-dinner-in-china-in-2005/
                - generic [ref=e238]:
                  - img "Four family members remain around the same dinner table as the father lifts food and the mother nods." [ref=e239]
                  - generic:
                    - generic: GIF
                    - generic: by GPT Image 2.6
                - generic [ref=e240]:
                  - generic [ref=e241]: "0230"
                  - generic [ref=e242]: Family dinner in China in 2005
                - generic [ref=e243]: GPT Image 2.6 · 1:1 · Nov 4
              - button "Save" [ref=e246] [cursor=pointer]
            - article [ref=e251]:
              - link "White chicken opens and closes its wings across six tai-chi-inspired poses in a courtyard. GIF by GPT Image 2.6 0229 Chicken practicing tai chi GPT Image 2.6 · 1:1 · Nov 4" [ref=e252]:
                - /url: /en/prompts/image26-g06-chicken-practicing-tai-chi/
                - generic [ref=e253]:
                  - img "White chicken opens and closes its wings across six tai-chi-inspired poses in a courtyard." [ref=e254]
                  - generic:
                    - generic: GIF
                    - generic: by GPT Image 2.6
                - generic [ref=e255]:
                  - generic [ref=e256]: "0229"
                  - generic [ref=e257]: Chicken practicing tai chi
                - generic [ref=e258]: GPT Image 2.6 · 1:1 · Nov 4
              - button "Save" [ref=e261] [cursor=pointer]
            - article [ref=e266]:
              - link "Synthetic blue-haired character retains hair clip and apron across six rice-eating poses. GIF by GPT Image 2.6 0228 Blue-haired character eating rice GPT Image 2.6 · 1:1 · Nov 4" [ref=e267]:
                - /url: /en/prompts/image26-g05-blue-haired-character-eating-rice/
                - generic [ref=e268]:
                  - img "Synthetic blue-haired character retains hair clip and apron across six rice-eating poses." [ref=e269]
                  - generic:
                    - generic: GIF
                    - generic: by GPT Image 2.6
                - generic [ref=e270]:
                  - generic [ref=e271]: "0228"
                  - generic [ref=e272]: Blue-haired character eating rice
                - generic [ref=e273]: GPT Image 2.6 · 1:1 · Nov 4
              - button "Save" [ref=e276] [cursor=pointer]
            - article [ref=e281]:
              - link "Six white-chicken dance poses alternate feet and wings, ending with a smile. GIF by GPT Image 2.6 0227 Dancing white chicken GPT Image 2.6 · 1:1 · Nov 4" [ref=e282]:
                - /url: /en/prompts/image26-g04-dancing-white-chicken/
                - generic [ref=e283]:
                  - img "Six white-chicken dance poses alternate feet and wings, ending with a smile." [ref=e284]
                  - generic:
                    - generic: GIF
                    - generic: by GPT Image 2.6
                - generic [ref=e285]:
                  - generic [ref=e286]: "0227"
                  - generic [ref=e287]: Dancing white chicken
                - generic [ref=e288]: GPT Image 2.6 · 1:1 · Nov 4
              - button "Save" [ref=e291] [cursor=pointer]
            - article [ref=e296]:
              - link "Six generated office poses show surprise, celebration and tossing blank paper slips, then return to seated start. GIF by GPT Image 2.6 0226 Rising-stock celebration loop GPT Image 2.6 · 1:1 · Nov 4" [ref=e297]:
                - /url: /en/prompts/image26-g03-rising-stock-celebration-loop/
                - generic [ref=e298]:
                  - img "Six generated office poses show surprise, celebration and tossing blank paper slips, then return to seated start." [ref=e299]
                  - generic:
                    - generic: GIF
                    - generic: by GPT Image 2.6
                - generic [ref=e300]:
                  - generic [ref=e301]: "0226"
                  - generic [ref=e302]: Rising-stock celebration loop
                - generic [ref=e303]: GPT Image 2.6 · 1:1 · Nov 4
              - button "Save" [ref=e306] [cursor=pointer]
            - article [ref=e311]:
              - link "Six-frame office reaction progresses from hope to shock, crying and wiping tears, then returns to the starting pose. GIF by GPT Image 2.6 0225 Falling-stock reaction loop GPT Image 2.6 · 1:1 · Nov 4" [ref=e312]:
                - /url: /en/prompts/image26-g02-falling-stock-reaction-loop/
                - generic [ref=e313]:
                  - img "Six-frame office reaction progresses from hope to shock, crying and wiping tears, then returns to the starting pose." [ref=e314]
                  - generic:
                    - generic: GIF
                    - generic: by GPT Image 2.6
                - generic [ref=e315]:
                  - generic [ref=e316]: "0225"
                  - generic [ref=e317]: Falling-stock reaction loop
                - generic [ref=e318]: GPT Image 2.6 · 1:1 · Nov 4
              - button "Save" [ref=e321] [cursor=pointer]
            - article [ref=e326]:
              - link "Six distinct generated poses show the monkey raising and lowering the lantern and blinking. GIF by GPT Image 2.6 0224 Monkey raising a lantern GPT Image 2.6 · 1:1 · Nov 4" [ref=e327]:
                - /url: /en/prompts/image26-g01-monkey-raising-a-lantern/
                - generic [ref=e328]:
                  - img "Six distinct generated poses show the monkey raising and lowering the lantern and blinking." [ref=e329]
                  - generic:
                    - generic: GIF
                    - generic: by GPT Image 2.6
                - generic [ref=e330]:
                  - generic [ref=e331]: "0224"
                  - generic [ref=e332]: Monkey raising a lantern
                - generic [ref=e333]: GPT Image 2.6 · 1:1 · Nov 4
              - button "Save" [ref=e336] [cursor=pointer]
            - article [ref=e341]:
              - img "One sparkling drink bottle remains unobscured; lemon, mint and sharp water arcs frame it on navy, with the left third reserved for copy." [ref=e343]
              - generic [ref=e344]:
                - generic [ref=e345]: Collection · 58 works
                - heading "Design AI Prompt Top 60" [level=2] [ref=e346]
                - paragraph [ref=e347]: Independently adapted design prompts with GPT Image showcase results.
                - link "View collection" [ref=e348]:
                  - /url: /en/collections/design-ai-prompt-top-60/
            - article [ref=e351]:
              - link "Pelican with complete beak rides a red bicycle beside the sea at sunset. by GPT Image 2.6 0223 Pelican on a red bicycle GPT Image 2.6 · 3:2 · Nov 4" [ref=e352]:
                - /url: /en/prompts/image26-s15-pelican-on-a-red-bicycle/
                - generic [ref=e353]:
                  - img "Pelican with complete beak rides a red bicycle beside the sea at sunset." [ref=e354]
                  - generic: by GPT Image 2.6
                - generic [ref=e355]:
                  - generic [ref=e356]: "0223"
                  - generic [ref=e357]: Pelican on a red bicycle
                - generic [ref=e358]: GPT Image 2.6 · 3:2 · Nov 4
              - button "Save" [ref=e361] [cursor=pointer]
            - article [ref=e366]:
              - link "Orange koi seen from above in pale blue water with light caustics; tail slightly cropped at left. by GPT Image 2.6 0222 Orange koi in pale blue water GPT Image 2.6 · 3:2 · Nov 4" [ref=e367]:
                - /url: /en/prompts/image26-s14-orange-koi-in-pale-blue-water/
                - generic [ref=e368]:
                  - img "Orange koi seen from above in pale blue water with light caustics; tail slightly cropped at left." [ref=e369]
                  - generic: by GPT Image 2.6
                - generic [ref=e370]:
                  - generic [ref=e371]: "0222"
                  - generic [ref=e372]: Orange koi in pale blue water
                - generic [ref=e373]: GPT Image 2.6 · 3:2 · Nov 4
              - button "Save" [ref=e376] [cursor=pointer]
            - article [ref=e381]:
              - link "Twelve orange-cat workplace stickers in three columns and four rows. by GPT Image 2.6 0221 Orange office cat sticker sheet GPT Image 2.6 · 1199:1312 · Nov 4" [ref=e382]:
                - /url: /en/prompts/image26-s13-orange-office-cat-sticker-sheet/
                - generic [ref=e383]:
                  - img "Twelve orange-cat workplace stickers in three columns and four rows." [ref=e384]
                  - generic: by GPT Image 2.6
                - generic [ref=e385]:
                  - generic [ref=e386]: "0221"
                  - generic [ref=e387]: Orange office cat sticker sheet
                - generic [ref=e388]: GPT Image 2.6 · 1199:1312 · Nov 4
              - button "Save" [ref=e391] [cursor=pointer]
            - article [ref=e396]:
              - link "Preserves the sketch river curve, three foreground pines and right-side bridge. by GPT Image 2.6 0220 River valley sketch to photograph GPT Image 2.6 · 3:2 · Nov 4" [ref=e397]:
                - /url: /en/prompts/image26-s12-river-valley-sketch-to-photograph/
                - generic [ref=e398]:
                  - img "Preserves the sketch river curve, three foreground pines and right-side bridge." [ref=e399]
                  - generic: by GPT Image 2.6
                - generic [ref=e400]:
                  - generic [ref=e401]: "0220"
                  - generic [ref=e402]: River valley sketch to photograph
                - generic [ref=e403]: GPT Image 2.6 · 3:2 · Nov 4
              - button "Save" [ref=e406] [cursor=pointer]
            - article [ref=e411]:
              - link "Side-view motorcycle rider adapts the synthetic reference palette and blocky outline while changing the vehicle and clothing. by GPT Image 2.6 0219 Pixel-art motorcycle rider GPT Image 2.6 · 3:2 · Nov 4" [ref=e412]:
                - /url: /en/prompts/image26-s11-pixel-art-motorcycle-rider/
                - generic [ref=e413]:
                  - img "Side-view motorcycle rider adapts the synthetic reference palette and blocky outline while changing the vehicle and clothing." [ref=e414]
                  - generic: by GPT Image 2.6
                - generic [ref=e415]:
                  - generic [ref=e416]: "0219"
                  - generic [ref=e417]: Pixel-art motorcycle rider
                - generic [ref=e418]: GPT Image 2.6 · 3:2 · Nov 4
              - button "Save" [ref=e421] [cursor=pointer]
            - article [ref=e426]:
              - link "Vase changed from cream to cobalt blue, red markup removed. by GPT Image 2.6 0218 Change a vase color using a photo and markup GPT Image 2.6 · 16:9 · Nov 4" [ref=e427]:
                - /url: /en/prompts/image26-s10-marked-vase-color-edit/
                - generic [ref=e428]:
                  - img "Vase changed from cream to cobalt blue, red markup removed." [ref=e429]
                  - generic: by GPT Image 2.6
                - generic [ref=e430]:
                  - generic [ref=e431]: "0218"
                  - generic [ref=e432]: Change a vase color using a photo and markup
                - generic [ref=e433]: GPT Image 2.6 · 16:9 · Nov 4
              - button "Save" [ref=e436] [cursor=pointer]
            - article [ref=e441]:
              - link "Fictional market slide has 2026/2027/2028 bars of 10/14/19 and visible illustrative-data disclaimer. 0217 Market opportunity pitch slide Not verified · 16:9" [ref=e442]:
                - /url: /en/prompts/image26-s09-market-opportunity-pitch-slide/
                - img "Fictional market slide has 2026/2027/2028 bars of 10/14/19 and visible illustrative-data disclaimer." [ref=e444]
                - generic [ref=e445]:
                  - generic [ref=e446]: "0217"
                  - generic [ref=e447]: Market opportunity pitch slide
                - generic [ref=e448]: Not verified · 16:9
              - button "Save" [ref=e451] [cursor=pointer]
            - article [ref=e456]:
              - link "Legible Chinese concept diagram distinguishes cytoplasm, mitochondrial matrix and inner membrane, with oxygen, water and ATP. by GPT Image 2.6 0216 Cellular respiration learning diagram GPT Image 2.6 · 16:9 · Nov 4" [ref=e457]:
                - /url: /en/prompts/image26-s08-cellular-respiration-learning-diagram/
                - generic [ref=e458]:
                  - img "Legible Chinese concept diagram distinguishes cytoplasm, mitochondrial matrix and inner membrane, with oxygen, water and ATP." [ref=e459]
                  - generic: by GPT Image 2.6
                - generic [ref=e460]:
                  - generic [ref=e461]: "0216"
                  - generic [ref=e462]: Cellular respiration learning diagram
                - generic [ref=e463]: GPT Image 2.6 · 16:9 · Nov 4
              - button "Save" [ref=e466] [cursor=pointer]
            - article [ref=e471]:
              - link "Chinese farmers market UI includes search, produce and bakery cards, two merchant cards, opening hours and four navigation icons. by GPT Image 2.6 0215 Farmers market mobile interface GPT Image 2.6 · 2:3 · Nov 4" [ref=e472]:
                - /url: /en/prompts/image26-s07-farmers-market-mobile-interface/
                - generic [ref=e473]:
                  - img "Chinese farmers market UI includes search, produce and bakery cards, two merchant cards, opening hours and four navigation icons." [ref=e474]
                  - generic: by GPT Image 2.6
                - generic [ref=e475]:
                  - generic [ref=e476]: "0215"
                  - generic [ref=e477]: Farmers market mobile interface
                - generic [ref=e478]: GPT Image 2.6 · 2:3 · Nov 4
              - button "Save" [ref=e481] [cursor=pointer]
            - article [ref=e486]:
              - link "Four-panel comic preserves the red-collared dog and living room. by GPT Image 2.6 0214 Pet home-alone comic strip GPT Image 2.6 · 1286:1223 · Nov 4" [ref=e487]:
                - /url: /en/prompts/image26-s06-pet-home-alone-comic-strip/
                - generic [ref=e488]:
                  - img "Four-panel comic preserves the red-collared dog and living room." [ref=e489]
                  - generic: by GPT Image 2.6
                - generic [ref=e490]:
                  - generic [ref=e491]: "0214"
                  - generic [ref=e492]: Pet home-alone comic strip
                - generic [ref=e493]: GPT Image 2.6 · 1286:1223 · Nov 4
              - button "Save" [ref=e496] [cursor=pointer]
            - article [ref=e501]:
              - 'link "Fictional period-style outdoor festival scene: seated adults, vintage camera and vehicles, distant stage, faded film texture. by GPT Image 2.6 0213 1969 outdoor music festival GPT Image 2.6 · 3:2 · Nov 4" [ref=e502]':
                - /url: /en/prompts/image26-s05-1969-outdoor-music-festival/
                - generic [ref=e503]:
                  - 'img "Fictional period-style outdoor festival scene: seated adults, vintage camera and vehicles, distant stage, faded film texture." [ref=e504]'
                  - generic: by GPT Image 2.6
                - generic [ref=e505]:
                  - generic [ref=e506]: "0213"
                  - generic [ref=e507]: 1969 outdoor music festival
                - generic [ref=e508]: GPT Image 2.6 · 3:2 · Nov 4
              - button "Save" [ref=e511] [cursor=pointer]
            - article [ref=e516]:
              - link "Bread and wheat mark with correctly spelled Field & Flour. by GPT Image 2.6 0212 Bakery logo GPT Image 2.6 · 3:2 · Nov 4" [ref=e517]:
                - /url: /en/prompts/image26-s04-bakery-logo/
                - generic [ref=e518]:
                  - img "Bread and wheat mark with correctly spelled Field & Flour." [ref=e519]
                  - generic: by GPT Image 2.6
                - generic [ref=e520]:
                  - generic [ref=e521]: "0212"
                  - generic [ref=e522]: Bakery logo
                - generic [ref=e523]: GPT Image 2.6 · 3:2 · Nov 4
              - button "Save" [ref=e526] [cursor=pointer]
          - generic [ref=e532]:
            - paragraph [ref=e533]:
              - generic [ref=e534]: Frames 1–24 of 231 shown
            - navigation "Pages of the list" [ref=e535]:
              - generic [aria-hidden] [ref=e536]: Page
              - list [ref=e537]:
                - listitem [ref=e538]:
                  - link "Page 1" [ref=e539]:
                    - /url: /en/prompts/
                    - text: "1"
                - listitem [ref=e540]:
                  - link "Page 2" [ref=e541]:
                    - /url: /en/prompts/page/2/
                    - text: "2"
                - listitem [ref=e542]:
                  - link "Page 3" [ref=e543]:
                    - /url: /en/prompts/page/3/
                    - text: "3"
                - listitem [ref=e544]:
                  - link "Page 4" [ref=e545]:
                    - /url: /en/prompts/page/4/
                    - text: "4"
                - listitem [ref=e546]:
                  - link "Page 5" [ref=e547]:
                    - /url: /en/prompts/page/5/
                    - text: "5"
                - listitem [ref=e548]:
                  - link "Page 6" [ref=e549]:
                    - /url: /en/prompts/page/6/
                    - text: "6"
                - listitem [ref=e550]:
                  - link "Page 7" [ref=e551]:
                    - /url: /en/prompts/page/7/
                    - text: "7"
                - listitem [ref=e552]:
                  - link "Page 8" [ref=e553]:
                    - /url: /en/prompts/page/8/
                    - text: "8"
                - listitem [ref=e554]:
                  - link "Page 9" [ref=e555]:
                    - /url: /en/prompts/page/9/
                    - text: "9"
                - listitem [ref=e556]:
                  - link "Page 10" [ref=e557]:
                    - /url: /en/prompts/page/10/
                    - text: "10"
          - paragraph [ref=e558]
  - contentinfo [ref=e559]:
    - generic [ref=e560]:
      - generic [ref=e561]:
        - generic [ref=e564]: PROMPT SEEN
        - paragraph [ref=e565]: Tested image prompts and templates. See what each phrase does.
        - link "Prompt Seen on GitHub" [ref=e566]:
          - /url: https://github.com/picontapLab/prompt-seen
      - navigation [ref=e569]:
        - heading "LANGUAGES" [level=2] [ref=e570]
        - list [ref=e571]:
          - listitem [ref=e572]:
            - link "English" [ref=e573]:
              - /url: /
          - listitem [ref=e574]:
            - link "简体中文" [ref=e575]:
              - /url: /zh-hans/
      - generic [ref=e576]:
        - heading [level=2] [aria-hidden] [ref=e577]: THEME
        - generic [ref=e578]:
          - generic [ref=e579]: Theme
          - radiogroup "Theme" [ref=e580]:
            - radio "System" [checked] [ref=e581] [cursor=pointer]
            - radio "Light" [ref=e584] [cursor=pointer]
            - radio "Dark" [ref=e586] [cursor=pointer]
        - link "Saved" [ref=e588]:
          - /url: /en/favorites/
        - button "Keyboard shortcuts" [ref=e591] [cursor=pointer]
      - navigation "Prompt Seen" [ref=e595]:
        - list [ref=e596]:
          - listitem [ref=e597]:
            - link "About Prompt Seen" [ref=e598]:
              - /url: /en/about/
          - listitem [ref=e599]:
            - link "License" [ref=e600]:
              - /url: /en/license/
      - paragraph [ref=e601]: "Code: MIT. Prompt text and notes: CC BY 4.0. Images: licence noted per work."
```

# Test source

```ts
  10  | 
  11  | const locale = BUILD.locales[0]!;
  12  | const code = locale.code;
  13  | const index = feedIndex(code);
  14  | const exploreUrl = `${BASE}/${locale.pathPrefix}/explore/`;
  15  | const listUrl = `${BASE}/${locale.pathPrefix}/prompts/`;
  16  | const filters = (page: Page) => page.locator('[data-explore-filters]');
  17  | const shownIds = (page: Page) =>
  18  |   page
  19  |     .locator('[role="feed"] > article')
  20  |     .evaluateAll((els) =>
  21  |       els
  22  |         .filter((e) => !e.hasAttribute('data-interlude') || e.getAttribute('data-reason') === 'extreme')
  23  |         .map((e) => e.getAttribute('data-entry')),
  24  |     );
  25  | 
  26  | const hydrated = (page: Page) =>
  27  |   page.waitForFunction(() => {
  28  |     const el = document.querySelector('[data-explore-filters] button');
  29  |     return !!el && Object.keys(el).some((k) => k.startsWith('__reactProps'));
  30  |   });
  31  | 
  32  | test.describe('desktop', () => {
  33  |   test.use({ viewport: { width: 1440, height: 900 } });
  34  | 
  35  |   test('options combine across dimensions, counts follow, and zero-result options are disabled', async ({ page }) => {
  36  |     const errors: string[] = [];
  37  |     page.on('pageerror', (e) => errors.push(e.message));
  38  |     await page.goto(exploreUrl);
  39  |     await hydrated(page);
  40  |     await expect(filters(page)).toBeVisible();
  41  |     await expect(page.locator('[data-page="explore"] [data-band]')).toHaveCount(0);
  42  | 
  43  |     // Pick the use with the most works, then a shape that still leaves some.
  44  |     const use = [...index.useCases].sort(
  45  |       (a, b) =>
  46  |         index.items.filter((f) => f.u.includes(b.id)).length - index.items.filter((f) => f.u.includes(a.id)).length,
  47  |     )[0]!;
  48  |     await filters(page)
  49  |       .getByRole('button', { name: new RegExp(`^${use.label}`) })
  50  |       .click();
  51  |     await expect(page).toHaveURL(new RegExp(`/explore/#use=${use.id}$`));
  52  |     let query: FeedQuery = { ...EMPTY_QUERY, use: [use.id] };
  53  |     await expect(filters(page).locator('[data-results]')).toHaveText(
  54  |       message(code, 'feed.filters.results').includes('{count')
  55  |         ? new RegExp(`${queryResults(index, query).length}`)
  56  |         : /./,
  57  |     );
  58  |     await expect
  59  |       .poll(async () => (await shownIds(page)).slice(0, 24))
  60  |       .toEqual(
  61  |         queryResults(index, query)
  62  |           .slice(0, 24)
  63  |           .map((f) => f.id),
  64  |       );
  65  | 
  66  |     // Every option with no results under the other conditions is disabled; the others are not.
  67  |     const counts = facetCounts(index, query);
  68  |     for (const s of index.styles) {
  69  |       const chip = filters(page).getByRole('button', { name: new RegExp(`^${s.label}`) });
  70  |       if ((counts.style[s.id] ?? 0) === 0) await expect(chip).toBeDisabled();
  71  |       else await expect(chip).toBeEnabled();
  72  |     }
  73  | 
  74  |     const shape = (['portrait', 'square', 'landscape', 'panorama'] as const).find((s) => counts.shape[s] > 0)!;
  75  |     await filters(page)
  76  |       .getByRole('button', { name: new RegExp(`^${message(code, `feed.filters.shapes.${shape}`)}`) })
  77  |       .click();
  78  |     query = { ...query, shape: [shape] };
  79  |     await expect(page).toHaveURL(new RegExp(`/explore/#use=${use.id}&shape=${shape}$`));
  80  |     await expect
  81  |       .poll(async () => (await shownIds(page)).slice(0, 24))
  82  |       .toEqual(
  83  |         queryResults(index, query)
  84  |           .slice(0, 24)
  85  |           .map((f) => f.id),
  86  |       );
  87  | 
  88  |     // Shared or reloaded, the same conditions come back; the path stays the explore page.
  89  |     await page.reload();
  90  |     await hydrated(page);
  91  |     await expect(filters(page).getByRole('button', { name: new RegExp(`^${use.label}`) })).toHaveAttribute(
  92  |       'aria-pressed',
  93  |       'true',
  94  |     );
  95  |     await page.mouse.wheel(0, 3000);
  96  |     await page.waitForTimeout(400);
  97  |     expect(new URL(page.url()).pathname).toBe(exploreUrl);
  98  |     expect(await seriousViolations(page)).toEqual([]);
  99  | 
  100 |     // Clear.
  101 |     await filters(page)
  102 |       .getByRole('button', { name: new RegExp(message(code, 'feed.filters.clear')) })
  103 |       .click();
  104 |     await expect(page).toHaveURL(exploreUrl);
  105 |     expect(errors).toEqual([]);
  106 |   });
  107 | 
  108 |   test('the list links to explore with its conditions, and works open in the popup there', async ({ page }) => {
  109 |     const style = index.styles.find((s) => index.items.some((f) => f.s.includes(s.id)))!;
> 110 |     await page.goto(`${listUrl}#style=${style.id}`);
      |                ^ Error: page.goto: Test timeout of 30000ms exceeded.
  111 |     await page.waitForFunction(() =>
  112 |       Object.keys(document.querySelector('[data-explore-link]') ?? {}).some((k) => k.startsWith('__react')),
  113 |     );
  114 |     await expect(page.locator('[data-explore-link]')).toHaveAttribute('href', `${exploreUrl}#style=${style.id}`);
  115 |     await page.locator('[data-explore-link]').click();
  116 |     await expect(page).toHaveURL(`${exploreUrl}#style=${style.id}`);
  117 |     await hydrated(page);
  118 |     await expect(filters(page).getByRole('button', { name: new RegExp(`^${style.label}`) })).toHaveAttribute(
  119 |       'aria-pressed',
  120 |       'true',
  121 |     );
  122 |     const card = page.locator('[role="feed"] > article[data-entry]:not([data-interlude])').first();
  123 |     await card.locator('a').first().click();
  124 |     await expect(page.locator('dialog[open]')).toBeVisible();
  125 |     await page.keyboard.press('Escape');
  126 |     await expect(page.locator('dialog[open]')).toHaveCount(0);
  127 |     expect(new URL(page.url()).pathname).toBe(exploreUrl);
  128 |   });
  129 | });
  130 | 
  131 | test('narrow screens use the list’s filter bar instead of the side panel', async ({ page }) => {
  132 |   await page.setViewportSize({ width: 390, height: 844 });
  133 |   await page.goto(exploreUrl);
  134 |   await expect(filters(page)).toBeHidden();
  135 |   await expect(page.getByRole('button', { name: message(code, 'feed.filters.open'), exact: true })).toBeVisible();
  136 | });
  137 | 
```