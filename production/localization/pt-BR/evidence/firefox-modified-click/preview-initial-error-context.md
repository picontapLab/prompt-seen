# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: popup.browser.spec.ts >> desktop >> modified clicks and pages without JavaScript reach the full page
- Location: tests/e2e/popup.browser.spec.ts:546:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: browserContext.waitForEvent: Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main"
  - banner [ref=e3]:
    - generic [ref=e4]:
      - link "Prompt Seen home" [ref=e5] [cursor=pointer]:
        - /url: /prompt-seen/
        - generic [ref=e8]: PROMPT SEEN
      - navigation "Main" [ref=e9]:
        - list [ref=e10]:
          - listitem [ref=e11]:
            - link "Prompts" [ref=e12] [cursor=pointer]:
              - /url: /prompt-seen/en/prompts/
          - listitem [ref=e13]:
            - link "Templates" [ref=e14] [cursor=pointer]:
              - /url: /prompt-seen/en/templates/
          - listitem [ref=e15]:
            - link "Collections" [ref=e16] [cursor=pointer]:
              - /url: /prompt-seen/en/collections/
      - generic [ref=e17]:
        - link "Search" [ref=e18] [cursor=pointer]:
          - /url: /prompt-seen/en/search/
          - generic [ref=e19]:
            - generic [ref=e23]: Search
            - generic [aria-hidden] [ref=e24]: /
        - link "Saved" [ref=e25] [cursor=pointer]:
          - /url: /prompt-seen/en/favorites/
          - generic [aria-hidden] [ref=e29]: Saved
        - 'button "Language: English" [ref=e32] [cursor=pointer]':
          - generic [ref=e33]:
            - generic [ref=e34]: "Language:"
            - text: English
        - link "Prompt Seen on GitHub" [ref=e38] [cursor=pointer]:
          - /url: https://github.com/picontapLab/prompt-seen
        - button "Switch to dark theme" [ref=e42] [cursor=pointer]
  - main [ref=e48]:
    - generic [ref=e49]:
      - generic [ref=e50]:
        - generic [ref=e51]:
          - heading "The roll" [level=1] [ref=e52]
          - paragraph [ref=e54]: Every prompt we have tested, newest first, each printed with the frame it produced. Point at a work to read how its prompt opens; open it for the whole prompt, the test record and what each phrase does.
        - paragraph [ref=e55]:
          - text: 288 frames
          - generic [ref=e56]: · Page 1 of 12
      - generic [ref=e58]:
        - region [ref=e60]:
          - heading "This week's picks" [level=2] [ref=e61]
          - generic [ref=e62]:
            - figure [ref=e64]:
              - generic [ref=e65]:
                - generic [ref=e66]:
                  - img "One product photo becomes nine coordinated campaign compositions." [ref=e67]
                  - generic [aria-hidden]:
                    - generic: A
                    - generic: B
                - generic [ref=e68]:
                  - generic [ref=e69]: "0123"
                  - heading "3x3 product campaign from one reference photo" [level=3] [ref=e70]
                  - generic [ref=e71]: GPT Image 2.5 · Oct 29, 2026
              - generic [ref=e72]:
                - paragraph [ref=e73]: Prompt · English
                - blockquote [ref=e74]:
                  - text: "Using the uploaded product photo, design a 3-by-3 campaign contact sheet. Keep the container, label and brand palette consistent across all nine panels. Use this campaign palette: sage green, ivory and brushed silver. In reading order the nine panels show: hero shot;"
                  - button "cap and label close-up A" [ref=e75] [cursor=pointer]
                  - text: ; hand holding the bottle; brushed metal detail;
                  - button "three-bottle repeated arrangement B" [ref=e76] [cursor=pointer]
                  - text: ; floating bottle; paint texture macro; bottle beside leaves; bottle on a picnic table.…
                - paragraph [aria-hidden] [ref=e77]
                - region [ref=e78]:
                  - heading "What each phrase does" [level=2] [ref=e79]
                  - list [ref=e80]:
                    - listitem:
                      - generic [aria-hidden] [ref=e81]: A
                      - generic [ref=e82]: cap and label close-up The second panel reserves space for the cap texture and readable PINE mark.
                    - listitem:
                      - generic [aria-hidden] [ref=e83]: B
                      - generic [ref=e84]: three-bottle repeated arrangement Repeating the same product establishes a coherent campaign rhythm.
                - generic [ref=e85]:
                  - generic [ref=e86]:
                    - button "Copy prompt" [ref=e87] [cursor=pointer]
                    - status [ref=e94]
                  - link "Open frame" [ref=e95] [cursor=pointer]:
                    - /url: /prompt-seen/en/prompts/product-brand-story-grid/
            - generic [ref=e99]:
              - generic [ref=e100]:
                - link "Sixteen emotions become a consistent character sticker sheet with short Chinese captions. by GPT Image 2.5 0146 Chinese character sticker sheet Sixteen emotions become a consistent character sticker sheet with short Chinese captions. GPT Image 2.5 · 1:1 · Oct 29" [ref=e101] [cursor=pointer]:
                  - /url: /prompt-seen/en/prompts/character-chinese-sticker-sheet/
                  - generic [ref=e102]:
                    - img "Sixteen emotions become a consistent character sticker sheet with short Chinese captions." [ref=e103]
                    - generic: by GPT Image 2.5
                  - generic [ref=e104]:
                    - generic [ref=e105]: "0146"
                    - generic [ref=e106]: Chinese character sticker sheet
                  - generic [ref=e107]:
                    - generic [ref=e108]: Sixteen emotions become a consistent character sticker sheet with short Chinese captions.
                    - generic [ref=e109]: GPT Image 2.5 · 1:1 · Oct 29
                - button "Save" [ref=e111] [cursor=pointer]
              - generic [ref=e116]:
                - link "A miniature alpine valley inside a crystal sphere, with a waterfall flowing across an oak table. by GPT Image 2.5 0101 Crystal sphere waterfall A miniature alpine world spills a waterfall out of a glass sphere and over an oak table. GPT Image 2.5 · 1312:1199 · Oct 29" [ref=e117] [cursor=pointer]:
                  - /url: /prompt-seen/en/prompts/crystal-sphere-waterfall/
                  - generic [ref=e118]:
                    - img "A miniature alpine valley inside a crystal sphere, with a waterfall flowing across an oak table." [ref=e119]
                    - generic: by GPT Image 2.5
                  - generic [ref=e120]:
                    - generic [ref=e121]: "0101"
                    - generic [ref=e122]: Crystal sphere waterfall
                  - generic [ref=e123]:
                    - generic [ref=e124]: A miniature alpine world spills a waterfall out of a glass sphere and over an oak table.
                    - generic [ref=e125]: GPT Image 2.5 · 1312:1199 · Oct 29
                - button "Save" [ref=e127] [cursor=pointer]
        - generic [ref=e133]:
          - group "Style" [ref=e135]:
            - button "All 288" [pressed] [ref=e136] [cursor=pointer]
            - button "Ink wash 8" [ref=e137] [cursor=pointer]
            - button "Flat vector 46" [ref=e138] [cursor=pointer]
            - button "Bauhaus 8" [ref=e139] [cursor=pointer]
            - button "Neon 9" [ref=e140] [cursor=pointer]
            - button "Minimal 35" [ref=e141] [cursor=pointer]
            - button "Gradient 9" [ref=e142] [cursor=pointer]
            - button "Geometric 11" [ref=e143] [cursor=pointer]
            - button "Cyanotype 1" [ref=e144] [cursor=pointer]
          - generic [ref=e145]:
            - button "Use · Shape" [ref=e146] [cursor=pointer]
            - link "Explore" [ref=e158] [cursor=pointer]:
              - /url: /prompt-seen/en/explore/
            - generic [ref=e163]:
              - generic: Sort
              - button "Newest first Sort" [ref=e165] [cursor=pointer]:
                - generic [ref=e166]: Newest first
        - generic [ref=e170]:
          - link "Skip the list" [ref=e171] [cursor=pointer]:
            - /url: "#_R_1minpfeiumivb_"
          - feed "Prompts" [ref=e173]:
            - article [ref=e174]:
              - link "A woman in a black suit holds sunglasses beside her reflection in a mirrored elevator. by GPT Image 0315 Mirrored elevator portrait in a tailored suit — independent adaptation A woman in a black suit holds sunglasses beside her reflection in a mirrored elevator. GPT Image · 9:16 · Nov 9" [active] [ref=e175] [cursor=pointer]:
                - /url: /prompt-seen/en/prompts/adapted-s14-everyday-portrait/
                - generic [ref=e176]:
                  - img "A woman in a black suit holds sunglasses beside her reflection in a mirrored elevator." [ref=e177]
                  - generic: by GPT Image
                - generic [ref=e178]:
                  - generic [ref=e179]: "0315"
                  - generic [ref=e180]: Mirrored elevator portrait in a tailored suit — independent adaptation
                - generic [ref=e181]:
                  - generic [ref=e182]: A woman in a black suit holds sunglasses beside her reflection in a mirrored elevator.
                  - generic [ref=e183]: GPT Image · 9:16 · Nov 9
              - button "Save" [ref=e185] [cursor=pointer]
            - article [ref=e190]:
              - link "An adult woman in a full moon-white robe sits by a misty lake under cool moonlight. by GPT Image 0314 Moonlit lakeside portrait in an opaque hanfu robe — independent adaptation An adult woman in a full moon-white robe sits by a misty lake under cool moonlight. GPT Image · 9:16 · Nov 9" [ref=e191] [cursor=pointer]:
                - /url: /prompt-seen/en/prompts/adapted-s11-everyday-portrait/
                - generic [ref=e192]:
                  - img "An adult woman in a full moon-white robe sits by a misty lake under cool moonlight." [ref=e193]
                  - generic: by GPT Image
                - generic [ref=e194]:
                  - generic [ref=e195]: "0314"
                  - generic [ref=e196]: Moonlit lakeside portrait in an opaque hanfu robe — independent adaptation
                - generic [ref=e197]:
                  - generic [ref=e198]: An adult woman in a full moon-white robe sits by a misty lake under cool moonlight.
                  - generic [ref=e199]: GPT Image · 9:16 · Nov 9
              - button "Save" [ref=e201] [cursor=pointer]
            - article [ref=e206]:
              - link "Two adults read a city map in the rear seat, seen through the windshield at night. by GPT Image 0313 Nighttime windshield portrait with a city map — independent adaptation Two adults read a city map in the rear seat, seen through the windshield at night. GPT Image · 9:16 · Nov 9" [ref=e207] [cursor=pointer]:
                - /url: /prompt-seen/en/prompts/adapted-s04-everyday-portrait/
                - generic [ref=e208]:
                  - img "Two adults read a city map in the rear seat, seen through the windshield at night." [ref=e209]
                  - generic: by GPT Image
                - generic [ref=e210]:
                  - generic [ref=e211]: "0313"
                  - generic [ref=e212]: Nighttime windshield portrait with a city map — independent adaptation
                - generic [ref=e213]:
                  - generic [ref=e214]: Two adults read a city map in the rear seat, seen through the windshield at night.
                  - generic [ref=e215]: GPT Image · 9:16 · Nov 9
              - button "Save" [ref=e217] [cursor=pointer]
            - article [ref=e222]:
              - link "A high-angle bedroom selfie with a blue shirt, beige trousers and white sneakers. by GPT Image 0312 High-angle bedroom selfie in everyday clothes — independent adaptation A high-angle bedroom selfie with a blue shirt, beige trousers and white sneakers. GPT Image · 9:16 · Nov 9" [ref=e223] [cursor=pointer]:
                - /url: /prompt-seen/en/prompts/adapted-s01-everyday-portrait/
                - generic [ref=e224]:
                  - img "A high-angle bedroom selfie with a blue shirt, beige trousers and white sneakers." [ref=e225]
                  - generic: by GPT Image
                - generic [ref=e226]:
                  - generic [ref=e227]: "0312"
                  - generic [ref=e228]: High-angle bedroom selfie in everyday clothes — independent adaptation
                - generic [ref=e229]:
                  - generic [ref=e230]: A high-angle bedroom selfie with a blue shirt, beige trousers and white sneakers.
                  - generic [ref=e231]: GPT Image · 9:16 · Nov 9
              - button "Save" [ref=e233] [cursor=pointer]
            - article [ref=e238]:
              - link "Anime nod and closed eyes GIF by GPT Image 0311 Anime nod and closed eyes — composed GIF 9 frames, 1.8 seconds, 362×362px; plays once. GPT Image frame-sheet + local GIF encoding. GPT Image · 1:1 · Nov 9" [ref=e239] [cursor=pointer]:
                - /url: /prompt-seen/en/prompts/adapted-g18-nine-frame-composed-gif/
                - generic [ref=e240]:
                  - img "Anime nod and closed eyes" [ref=e241]
                  - generic:
                    - generic: GIF
                    - generic: by GPT Image
                - generic [ref=e242]:
                  - generic [ref=e243]: "0311"
                  - generic [ref=e244]: Anime nod and closed eyes — composed GIF
                - generic [ref=e245]:
                  - generic [ref=e246]: 9 frames, 1.8 seconds, 362×362px; plays once. GPT Image frame-sheet + local GIF encoding.
                  - generic [ref=e247]: GPT Image · 1:1 · Nov 9
              - button "Save" [ref=e249] [cursor=pointer]
            - article [ref=e254]:
              - link "Johnny Bravo eight-bit dance GIF by GPT Image 0310 Johnny Bravo eight-bit dance — composed GIF 9 frames, 0.8 seconds, 443×443px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding. GPT Image · 1:1 · Nov 9" [ref=e255] [cursor=pointer]:
                - /url: /prompt-seen/en/prompts/adapted-g17-nine-frame-composed-gif/
                - generic [ref=e256]:
                  - img "Johnny Bravo eight-bit dance" [ref=e257]
                  - generic:
                    - generic: GIF
                    - generic: by GPT Image
                - generic [ref=e258]:
                  - generic [ref=e259]: "0310"
                  - generic [ref=e260]: Johnny Bravo eight-bit dance — composed GIF
                - generic [ref=e261]:
                  - generic [ref=e262]: 9 frames, 0.8 seconds, 443×443px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding.
                  - generic [ref=e263]: GPT Image · 1:1 · Nov 9
              - button "Save" [ref=e265] [cursor=pointer]
            - article [ref=e270]:
              - link "Wizard staff spin and sparkles GIF by GPT Image 0309 Wizard staff spin and sparkles — composed GIF 9 frames, 1.2 seconds, 362×362px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding. GPT Image · 1:1 · Nov 9" [ref=e271] [cursor=pointer]:
                - /url: /prompt-seen/en/prompts/adapted-g16-nine-frame-composed-gif/
                - generic [ref=e272]:
                  - img "Wizard staff spin and sparkles" [ref=e273]
                  - generic:
                    - generic: GIF
                    - generic: by GPT Image
                - generic [ref=e274]:
                  - generic [ref=e275]: "0309"
                  - generic [ref=e276]: Wizard staff spin and sparkles — composed GIF
                - generic [ref=e277]:
                  - generic [ref=e278]: 9 frames, 1.2 seconds, 362×362px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding.
                  - generic [ref=e279]: GPT Image · 1:1 · Nov 9
              - button "Save" [ref=e281] [cursor=pointer]
            - article [ref=e286]:
              - link "Chibi dance of joy GIF by GPT Image 0308 Chibi dance of joy — composed GIF 9 frames, 1.2 seconds, 443×443px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding. GPT Image · 1:1 · Nov 9" [ref=e287] [cursor=pointer]:
                - /url: /prompt-seen/en/prompts/adapted-g15-nine-frame-composed-gif/
                - generic [ref=e288]:
                  - img "Chibi dance of joy" [ref=e289]
                  - generic:
                    - generic: GIF
                    - generic: by GPT Image
                - generic [ref=e290]:
                  - generic [ref=e291]: "0308"
                  - generic [ref=e292]: Chibi dance of joy — composed GIF
                - generic [ref=e293]:
                  - generic [ref=e294]: 9 frames, 1.2 seconds, 443×443px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding.
                  - generic [ref=e295]: GPT Image · 1:1 · Nov 9
              - button "Save" [ref=e297] [cursor=pointer]
            - article [ref=e302]:
              - link "Robin cat wink and falling hat GIF by GPT Image 0307 Robin cat wink and falling hat — composed GIF 9 frames, 2 seconds, 362×362px; plays once. GPT Image frame-sheet + local GIF encoding. GPT Image · 1:1 · Nov 9" [ref=e303] [cursor=pointer]:
                - /url: /prompt-seen/en/prompts/adapted-g14-nine-frame-composed-gif/
                - generic [ref=e304]:
                  - img "Robin cat wink and falling hat" [ref=e305]
                  - generic:
                    - generic: GIF
                    - generic: by GPT Image
                - generic [ref=e306]:
                  - generic [ref=e307]: "0307"
                  - generic [ref=e308]: Robin cat wink and falling hat — composed GIF
                - generic [ref=e309]:
                  - generic [ref=e310]: 9 frames, 2 seconds, 362×362px; plays once. GPT Image frame-sheet + local GIF encoding.
                  - generic [ref=e311]: GPT Image · 1:1 · Nov 9
              - button "Save" [ref=e313] [cursor=pointer]
            - article [ref=e318]:
              - link "Gentle anime blink GIF by GPT Image 0306 Gentle anime blink — composed GIF 9 frames, 2 seconds, 443×443px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding. GPT Image · 1:1 · Nov 9" [ref=e319] [cursor=pointer]:
                - /url: /prompt-seen/en/prompts/adapted-g13-nine-frame-composed-gif/
                - generic [ref=e320]:
                  - img "Gentle anime blink" [ref=e321]
                  - generic:
                    - generic: GIF
                    - generic: by GPT Image
                - generic [ref=e322]:
                  - generic [ref=e323]: "0306"
                  - generic [ref=e324]: Gentle anime blink — composed GIF
                - generic [ref=e325]:
                  - generic [ref=e326]: 9 frames, 2 seconds, 443×443px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding.
                  - generic [ref=e327]: GPT Image · 1:1 · Nov 9
              - button "Save" [ref=e329] [cursor=pointer]
            - article [ref=e334]:
              - link "Swordsman pixel water strike GIF by GPT Image 0305 Swordsman pixel water strike — composed GIF 9 frames, 1.8 seconds, 362×362px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding. GPT Image · 1:1 · Nov 9" [ref=e335] [cursor=pointer]:
                - /url: /prompt-seen/en/prompts/adapted-g12-nine-frame-composed-gif/
                - generic [ref=e336]:
                  - img "Swordsman pixel water strike" [ref=e337]
                  - generic:
                    - generic: GIF
                    - generic: by GPT Image
                - generic [ref=e338]:
                  - generic [ref=e339]: "0305"
                  - generic [ref=e340]: Swordsman pixel water strike — composed GIF
                - generic [ref=e341]:
                  - generic [ref=e342]: 9 frames, 1.8 seconds, 362×362px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding.
                  - generic [ref=e343]: GPT Image · 1:1 · Nov 9
              - button "Save" [ref=e345] [cursor=pointer]
            - article [ref=e350]:
              - link "Penguin delight GIF by GPT Image 0304 Penguin delight — composed GIF 9 frames, 1.6 seconds, 443×443px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding. GPT Image · 1:1 · Nov 9" [ref=e351] [cursor=pointer]:
                - /url: /prompt-seen/en/prompts/adapted-g11-delight-nine-frame-composed-gif/
                - generic [ref=e352]:
                  - img "Penguin delight" [ref=e353]
                  - generic:
                    - generic: GIF
                    - generic: by GPT Image
                - generic [ref=e354]:
                  - generic [ref=e355]: "0304"
                  - generic [ref=e356]: Penguin delight — composed GIF
                - generic [ref=e357]:
                  - generic [ref=e358]: 9 frames, 1.6 seconds, 443×443px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding.
                  - generic [ref=e359]: GPT Image · 1:1 · Nov 9
              - button "Save" [ref=e361] [cursor=pointer]
            - article [ref=e366]:
              - img "Nine cartoon reactions of a curly-haired person in a teal sweatshirt, each with a short English caption." [ref=e368]
              - generic [ref=e369]:
                - generic [ref=e370]: Collection · 12 works
                - heading "English Reactions and Social Images" [level=2] [ref=e371]
                - paragraph [ref=e372]: 12 tested image prompts for English reaction stickers, photo-booth memories, pet stories and birthday cards.
                - link "View collection" [ref=e373] [cursor=pointer]:
                  - /url: /prompt-seen/en/collections/english-social-reactions/
            - article [ref=e377]:
              - link "Penguin sorrow GIF by GPT Image 0303 Penguin sorrow — composed GIF 9 frames, 1.6 seconds, 443×443px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding. GPT Image · 1:1 · Nov 9" [ref=e378] [cursor=pointer]:
                - /url: /prompt-seen/en/prompts/adapted-g11-sorrow-nine-frame-composed-gif/
                - generic [ref=e379]:
                  - img "Penguin sorrow" [ref=e380]
                  - generic:
                    - generic: GIF
                    - generic: by GPT Image
                - generic [ref=e381]:
                  - generic [ref=e382]: "0303"
                  - generic [ref=e383]: Penguin sorrow — composed GIF
                - generic [ref=e384]:
                  - generic [ref=e385]: 9 frames, 1.6 seconds, 443×443px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding.
                  - generic [ref=e386]: GPT Image · 1:1 · Nov 9
              - button "Save" [ref=e388] [cursor=pointer]
            - article [ref=e393]:
              - link "Penguin anger GIF by GPT Image 0302 Penguin anger — composed GIF 9 frames, 1.6 seconds, 443×443px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding. GPT Image · 1:1 · Nov 9" [ref=e394] [cursor=pointer]:
                - /url: /prompt-seen/en/prompts/adapted-g11-anger-nine-frame-composed-gif/
                - generic [ref=e395]:
                  - img "Penguin anger" [ref=e396]
                  - generic:
                    - generic: GIF
                    - generic: by GPT Image
                - generic [ref=e397]:
                  - generic [ref=e398]: "0302"
                  - generic [ref=e399]: Penguin anger — composed GIF
                - generic [ref=e400]:
                  - generic [ref=e401]: 9 frames, 1.6 seconds, 443×443px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding.
                  - generic [ref=e402]: GPT Image · 1:1 · Nov 9
              - button "Save" [ref=e404] [cursor=pointer]
            - article [ref=e409]:
              - link "Penguin joy GIF by GPT Image 0301 Penguin joy — composed GIF 9 frames, 1.6 seconds, 443×443px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding. GPT Image · 1:1 · Nov 9" [ref=e410] [cursor=pointer]:
                - /url: /prompt-seen/en/prompts/adapted-g11-joy-nine-frame-composed-gif/
                - generic [ref=e411]:
                  - img "Penguin joy" [ref=e412]
                  - generic:
                    - generic: GIF
                    - generic: by GPT Image
                - generic [ref=e413]:
                  - generic [ref=e414]: "0301"
                  - generic [ref=e415]: Penguin joy — composed GIF
                - generic [ref=e416]:
                  - generic [ref=e417]: 9 frames, 1.6 seconds, 443×443px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding.
                  - generic [ref=e418]: GPT Image · 1:1 · Nov 9
              - button "Save" [ref=e420] [cursor=pointer]
            - article [ref=e425]:
              - link "Deadpan Tibetan fox applause GIF by GPT Image 0300 Deadpan Tibetan fox applause — composed GIF 9 frames, 1.8 seconds, 415×420px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding. GPT Image · 83:84 · Nov 9" [ref=e426] [cursor=pointer]:
                - /url: /prompt-seen/en/prompts/adapted-g10-nine-frame-composed-gif/
                - generic [ref=e427]:
                  - img "Deadpan Tibetan fox applause" [ref=e428]
                  - generic:
                    - generic: GIF
                    - generic: by GPT Image
                - generic [ref=e429]:
                  - generic [ref=e430]: "0300"
                  - generic [ref=e431]: Deadpan Tibetan fox applause — composed GIF
                - generic [ref=e432]:
                  - generic [ref=e433]: 9 frames, 1.8 seconds, 415×420px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding.
                  - generic [ref=e434]: GPT Image · 83:84 · Nov 9
              - button "Save" [ref=e436] [cursor=pointer]
            - article [ref=e441]:
              - link "Basketball dunk sequence GIF by GPT Image 0299 Basketball dunk sequence — composed GIF 9 frames, 1.8 seconds, 362×362px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding. GPT Image · 1:1 · Nov 9" [ref=e442] [cursor=pointer]:
                - /url: /prompt-seen/en/prompts/adapted-g09-nine-frame-composed-gif/
                - generic [ref=e443]:
                  - img "Basketball dunk sequence" [ref=e444]
                  - generic:
                    - generic: GIF
                    - generic: by GPT Image
                - generic [ref=e445]:
                  - generic [ref=e446]: "0299"
                  - generic [ref=e447]: Basketball dunk sequence — composed GIF
                - generic [ref=e448]:
                  - generic [ref=e449]: 9 frames, 1.8 seconds, 362×362px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding.
                  - generic [ref=e450]: GPT Image · 1:1 · Nov 9
              - button "Save" [ref=e452] [cursor=pointer]
            - article [ref=e457]:
              - link "Whale maid after work GIF by GPT Image 0298 Whale maid after work — composed GIF 9 frames, 2.4 seconds, 362×362px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding. GPT Image · 1:1 · Nov 9" [ref=e458] [cursor=pointer]:
                - /url: /prompt-seen/en/prompts/adapted-g08-nine-frame-composed-gif/
                - generic [ref=e459]:
                  - img "Whale maid after work" [ref=e460]
                  - generic:
                    - generic: GIF
                    - generic: by GPT Image
                - generic [ref=e461]:
                  - generic [ref=e462]: "0298"
                  - generic [ref=e463]: Whale maid after work — composed GIF
                - generic [ref=e464]:
                  - generic [ref=e465]: 9 frames, 2.4 seconds, 362×362px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding.
                  - generic [ref=e466]: GPT Image · 1:1 · Nov 9
              - button "Save" [ref=e468] [cursor=pointer]
            - article [ref=e473]:
              - link "Whale maid enjoys rice GIF by GPT Image 0297 Whale maid enjoys rice — composed GIF 9 frames, 2 seconds, 443×443px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding. GPT Image · 1:1 · Nov 9" [ref=e474] [cursor=pointer]:
                - /url: /prompt-seen/en/prompts/adapted-g07-nine-frame-composed-gif/
                - generic [ref=e475]:
                  - img "Whale maid enjoys rice" [ref=e476]
                  - generic:
                    - generic: GIF
                    - generic: by GPT Image
                - generic [ref=e477]:
                  - generic [ref=e478]: "0297"
                  - generic [ref=e479]: Whale maid enjoys rice — composed GIF
                - generic [ref=e480]:
                  - generic [ref=e481]: 9 frames, 2 seconds, 443×443px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding.
                  - generic [ref=e482]: GPT Image · 1:1 · Nov 9
              - button "Save" [ref=e484] [cursor=pointer]
            - article [ref=e489]:
              - link "Cat game asset turntable GIF by GPT Image 0296 Cat game asset turntable — composed GIF 9 frames, 1.44 seconds, 362×362px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding. GPT Image · 1:1 · Nov 9" [ref=e490] [cursor=pointer]:
                - /url: /prompt-seen/en/prompts/adapted-g06-cat-nine-frame-composed-gif/
                - generic [ref=e491]:
                  - img "Cat game asset turntable" [ref=e492]
                  - generic:
                    - generic: GIF
                    - generic: by GPT Image
                - generic [ref=e493]:
                  - generic [ref=e494]: "0296"
                  - generic [ref=e495]: Cat game asset turntable — composed GIF
                - generic [ref=e496]:
                  - generic [ref=e497]: 9 frames, 1.44 seconds, 362×362px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding.
                  - generic [ref=e498]: GPT Image · 1:1 · Nov 9
              - button "Save" [ref=e500] [cursor=pointer]
            - article [ref=e505]:
              - link "Motorbike game asset turntable GIF by GPT Image 0295 Motorbike game asset turntable — composed GIF 9 frames, 1.44 seconds, 362×362px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding. GPT Image · 1:1 · Nov 9" [ref=e506] [cursor=pointer]:
                - /url: /prompt-seen/en/prompts/adapted-g06-motorbike-nine-frame-composed-gif/
                - generic [ref=e507]:
                  - img "Motorbike game asset turntable" [ref=e508]
                  - generic:
                    - generic: GIF
                    - generic: by GPT Image
                - generic [ref=e509]:
                  - generic [ref=e510]: "0295"
                  - generic [ref=e511]: Motorbike game asset turntable — composed GIF
                - generic [ref=e512]:
                  - generic [ref=e513]: 9 frames, 1.44 seconds, 362×362px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding.
                  - generic [ref=e514]: GPT Image · 1:1 · Nov 9
              - button "Save" [ref=e516] [cursor=pointer]
            - article [ref=e521]:
              - link "Sword in stone turntable GIF by GPT Image 0294 Sword in stone turntable — composed GIF 9 frames, 1.44 seconds, 362×362px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding. GPT Image · 1:1 · Nov 9" [ref=e522] [cursor=pointer]:
                - /url: /prompt-seen/en/prompts/adapted-g06-sword-nine-frame-composed-gif/
                - generic [ref=e523]:
                  - img "Sword in stone turntable" [ref=e524]
                  - generic:
                    - generic: GIF
                    - generic: by GPT Image
                - generic [ref=e525]:
                  - generic [ref=e526]: "0294"
                  - generic [ref=e527]: Sword in stone turntable — composed GIF
                - generic [ref=e528]:
                  - generic [ref=e529]: 9 frames, 1.44 seconds, 362×362px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding.
                  - generic [ref=e530]: GPT Image · 1:1 · Nov 9
              - button "Save" [ref=e532] [cursor=pointer]
            - article [ref=e537]:
              - link "Dwarf game asset turntable GIF by GPT Image 0293 Dwarf game asset turntable — composed GIF 9 frames, 1.44 seconds, 362×362px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding. GPT Image · 1:1 · Nov 9" [ref=e538] [cursor=pointer]:
                - /url: /prompt-seen/en/prompts/adapted-g06-dwarf-nine-frame-composed-gif/
                - generic [ref=e539]:
                  - img "Dwarf game asset turntable" [ref=e540]
                  - generic:
                    - generic: GIF
                    - generic: by GPT Image
                - generic [ref=e541]:
                  - generic [ref=e542]: "0293"
                  - generic [ref=e543]: Dwarf game asset turntable — composed GIF
                - generic [ref=e544]:
                  - generic [ref=e545]: 9 frames, 1.44 seconds, 362×362px; repeats indefinitely. GPT Image frame-sheet + local GIF encoding.
                  - generic [ref=e546]: GPT Image · 1:1 · Nov 9
              - button "Save" [ref=e548] [cursor=pointer]
            - article [ref=e553]:
              - link "Summer garden water montage GIF by GPT Image 0292 Summer garden water montage — composed GIF 9 frames, 10 seconds, 320×569px; plays once. GPT Image frame-sheet + local GIF encoding. GPT Image · 9:16 · Nov 9" [ref=e554] [cursor=pointer]:
                - /url: /prompt-seen/en/prompts/adapted-g05-nine-frame-composed-gif/
                - generic [ref=e555]:
                  - img "Summer garden water montage" [ref=e556]
                  - generic:
                    - generic: GIF
                    - generic: by GPT Image
                - generic [ref=e557]:
                  - generic [ref=e558]: "0292"
                  - generic [ref=e559]: Summer garden water montage — composed GIF
                - generic [ref=e560]:
                  - generic [ref=e561]: 9 frames, 10 seconds, 320×569px; plays once. GPT Image frame-sheet + local GIF encoding.
                  - generic [ref=e562]: GPT Image · 9:16 · Nov 9
              - button "Save" [ref=e564] [cursor=pointer]
          - generic [ref=e570]:
            - paragraph [ref=e571]:
              - generic [ref=e572]: Frames 1–24 of 288 shown
            - navigation "Pages of the list" [ref=e573]:
              - generic [aria-hidden] [ref=e574]: Page
              - list [ref=e575]:
                - listitem [ref=e576]:
                  - link "Page 1" [ref=e577] [cursor=pointer]:
                    - /url: /prompt-seen/en/prompts/
                    - text: "1"
                - listitem [ref=e578]:
                  - link "Page 2" [ref=e579] [cursor=pointer]:
                    - /url: /prompt-seen/en/prompts/page/2/
                    - text: "2"
                - listitem [ref=e580]:
                  - link "Page 3" [ref=e581] [cursor=pointer]:
                    - /url: /prompt-seen/en/prompts/page/3/
                    - text: "3"
                - listitem [ref=e582]:
                  - link "Page 4" [ref=e583] [cursor=pointer]:
                    - /url: /prompt-seen/en/prompts/page/4/
                    - text: "4"
                - listitem [ref=e584]:
                  - link "Page 5" [ref=e585] [cursor=pointer]:
                    - /url: /prompt-seen/en/prompts/page/5/
                    - text: "5"
                - listitem [ref=e586]:
                  - link "Page 6" [ref=e587] [cursor=pointer]:
                    - /url: /prompt-seen/en/prompts/page/6/
                    - text: "6"
                - listitem [ref=e588]:
                  - link "Page 7" [ref=e589] [cursor=pointer]:
                    - /url: /prompt-seen/en/prompts/page/7/
                    - text: "7"
                - listitem [ref=e590]:
                  - link "Page 8" [ref=e591] [cursor=pointer]:
                    - /url: /prompt-seen/en/prompts/page/8/
                    - text: "8"
                - listitem [ref=e592]:
                  - link "Page 9" [ref=e593] [cursor=pointer]:
                    - /url: /prompt-seen/en/prompts/page/9/
                    - text: "9"
                - listitem [ref=e594]:
                  - link "Page 10" [ref=e595] [cursor=pointer]:
                    - /url: /prompt-seen/en/prompts/page/10/
                    - text: "10"
                - listitem [ref=e596]:
                  - link "Page 11" [ref=e597] [cursor=pointer]:
                    - /url: /prompt-seen/en/prompts/page/11/
                    - text: "11"
                - listitem [ref=e598]:
                  - link "Page 12" [ref=e599] [cursor=pointer]:
                    - /url: /prompt-seen/en/prompts/page/12/
                    - text: "12"
          - paragraph [ref=e600]
  - alert [ref=e601]
```

# Test source

```ts
  459 |     await expectOpen(page, host!.slug);
  460 |     await popup(page)
  461 |       .locator(`a[href="${detailUrl(related.slug)}"]`)
  462 |       .first()
  463 |       .click();
  464 |     await expectOpen(page, related.slug);
  465 |     expect((await state(page)).historyLength).toBe(historyLength + 1);
  466 |     await page.goBack();
  467 |     await expect(popup(page)).not.toHaveAttribute('open', '');
  468 |     await expect.poll(async () => (await state(page)).path).toBe(listUrl);
  469 |   });
  470 | 
  471 |   test('a link to another page leaves the popup; Back returns to it (§11.3.1)', async ({ page }) => {
  472 |     const host = works.find((w) => detailOf(w.slug).relatedTemplates.length > 0);
  473 |     test.skip(!host, 'no prompt with a related template');
  474 |     const template = detailOf(host!.slug).relatedTemplates[0]!;
  475 |     // Content dates can move the first related-template card beyond the initial batch.
  476 |     const pageNumber = Array.from({ length: index.pageCount }, (_, i) => i + 1).find((n) =>
  477 |       pagePromptIds(feedPage(code, n)).includes(host!.id),
  478 |     )!;
  479 |     await gotoList(page, pageNumber === 1 ? listUrl : `${listUrl}page/${pageNumber}/`);
  480 |     const { doc } = await state(page);
  481 |     await card(page, host!.slug).click();
  482 |     await expectOpen(page, host!.slug);
  483 |     await popup(page).locator(`a[href="${BASE}${template.path}"]`).first().click();
  484 |     await expect(page.locator('[data-page="template-detail"]')).toBeVisible();
  485 |     expect(await state(page)).toMatchObject({ open: false, locked: false, doc });
  486 |     await page.goBack();
  487 |     await expectOpen(page, host!.slug);
  488 |     expect((await state(page)).ours).toBe(true);
  489 |     await page.keyboard.press('Escape');
  490 |     await expect(popup(page)).not.toHaveAttribute('open', '');
  491 |     await expect.poll(async () => (await state(page)).locked).toBe(false);
  492 |   });
  493 | 
  494 |   test('Esc first cancels a current annotation, then closes (§11.1.9)', async ({ page }) => {
  495 |     const annotated = works.find((w) => detailOf(w.slug).annotations.length > 0);
  496 |     test.skip(!annotated, 'no annotated prompt');
  497 |     // Start on the sample's actual page; new entries may push it beyond page one.
  498 |     const pageNumber = Array.from({ length: index.pageCount }, (_, i) => i + 1).find((n) =>
  499 |       pagePromptIds(feedPage(code, n)).includes(annotated!.id),
  500 |     );
  501 |     expect(pageNumber).toBeDefined();
  502 |     await gotoList(page, pageNumber === 1 ? listUrl : `${listUrl}page/${pageNumber}/`);
  503 |     await card(page, annotated!.slug).click();
  504 |     await expectOpen(page, annotated!.slug);
  505 |     const phrase = popup(page).locator('button[data-letter="A"]');
  506 |     await phrase.focus();
  507 |     await page.keyboard.press('Enter');
  508 |     await expect(phrase).toHaveAttribute('aria-pressed', 'true');
  509 |     await page.keyboard.press('Escape');
  510 |     await expect(phrase).not.toHaveAttribute('aria-pressed', 'true');
  511 |     await expectOpen(page, annotated!.slug);
  512 |     await page.keyboard.press('Escape');
  513 |     await expectClosed(page, annotated!.slug);
  514 |   });
  515 | 
  516 |   test('an entry written by other code (no popup mark) closes by replacing it with the gallery', async ({ page }) => {
  517 |     await gotoList(page);
  518 |     const { historyLength, doc } = await state(page);
  519 |     await page.evaluate((url) => history.pushState(null, '', url), detailUrl(second.slug));
  520 |     await expectOpen(page, second.slug);
  521 |     expect((await state(page)).ours).toBe(false);
  522 |     await page.keyboard.press('Escape');
  523 |     // This foreign history entry needs a gallery navigation, not the cached popup
  524 |     // history path. Include that full-route load in the bounded close wait.
  525 |     await expect(popup(page)).not.toHaveAttribute('open', '', { timeout: 15_000 });
  526 |     expect(await state(page)).toMatchObject({ path: listUrl, historyLength: historyLength + 1, doc, locked: false });
  527 |   });
  528 | 
  529 |   test('§12.8-8: with reduced motion the same tasks work, without flight or movement', async ({ page }) => {
  530 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  531 |     await gotoList(page);
  532 |     const prefetched = page.waitForResponse((r) => r.url().endsWith(`/prompts/${first.slug}.json`));
  533 |     await card(page, first.slug).hover();
  534 |     await prefetched;
  535 |     await card(page, first.slug).click();
  536 |     await expectOpen(page, first.slug);
  537 |     expect(await popup(page).locator('img[data-popup-flight]').count()).toBe(0);
  538 |     expect(await popupMovement(page)).toEqual([]);
  539 |     await page.keyboard.press('ArrowRight');
  540 |     await expectOpen(page, second.slug);
  541 |     expect(await popupMovement(page)).toEqual([]);
  542 |     await popup(page).locator('[data-popup-close]').click();
  543 |     await expectClosed(page, second.slug);
  544 |   });
  545 | 
  546 |   test('modified clicks and pages without JavaScript reach the full page', async ({
  547 |     page,
  548 |     context,
  549 |     browser,
  550 |     baseURL,
  551 |   }) => {
  552 |     await gotoList(page);
  553 |     // This checks the browser's native new-tab action, not only the page's click handler.
  554 |     // Select the gallery first: Firefox can dispatch a trusted modified click without
  555 |     // opening its background tab when the originating browser window is not active.
  556 |     await page.bringToFront();
  557 |     const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  558 |     const [tab] = await Promise.all([
> 559 |       context.waitForEvent('page'),
      |               ^ Error: browserContext.waitForEvent: Test timeout of 30000ms exceeded.
  560 |       card(page, first.slug).click({ modifiers: [modifier] }),
  561 |     ]);
  562 |     // Assert the page after selecting the newly opened background tab, as a visitor would.
  563 |     // Firefox may defer its document while the gallery remains the foreground tab.
  564 |     await tab.bringToFront();
  565 |     await expect(tab.locator('[data-page="prompt-detail"] h1')).toHaveText(detailOf(first.slug).title);
  566 |     expect(await state(page)).toMatchObject({ path: listUrl, open: false });
  567 | 
  568 |     const noJs = await browser.newContext({ javaScriptEnabled: false, baseURL });
  569 |     const p = await noJs.newPage();
  570 |     await p.goto(listUrl);
  571 |     await p
  572 |       .locator(`[role="feed"] a[href="${detailUrl(first.slug)}"]`)
  573 |       .first()
  574 |       .click();
  575 |     await expect(p.locator('[data-page="prompt-detail"] h1')).toHaveText(detailOf(first.slug).title);
  576 |     await noJs.close();
  577 |   });
  578 | 
  579 |   test('topic pages open their works in the popup too', async ({ page }) => {
  580 |     const topic = localeIndex(code).topics[0];
  581 |     test.skip(!topic, 'no topic page in this locale');
  582 |     await page.goto(`${BASE}${topic!.path}`);
  583 |     const links = page.locator('[data-page="topic"] section ul a[href*="/prompts/"]');
  584 |     await expect(links.first()).toBeVisible();
  585 |     await page.waitForFunction(() =>
  586 |       Object.keys(document.querySelector('[data-page="topic"] section ul a')!).some((k) => k.startsWith('__react')),
  587 |     );
  588 |     const hrefs = await links.evaluateAll((els) => els.map((e) => e.getAttribute('href')!));
  589 |     const slugOf = (href: string) => href.split('/').filter(Boolean).at(-1)!;
  590 |     await links.first().click();
  591 |     await expectOpen(page, slugOf(hrefs[0]!));
  592 |     if (hrefs.length > 1) {
  593 |       await page.keyboard.press('ArrowRight');
  594 |       await expectOpen(page, slugOf(hrefs[1]!));
  595 |     }
  596 |     await page.keyboard.press('Escape');
  597 |     await expect(popup(page)).not.toHaveAttribute('open', '');
  598 |     await expect.poll(() => page.evaluate(() => location.pathname)).toBe(`${BASE}${topic!.path}`);
  599 |     await expect
  600 |       .poll(() => page.evaluate(() => document.activeElement?.getAttribute('href')))
  601 |       .toBe(hrefs[hrefs.length > 1 ? 1 : 0]);
  602 |   });
  603 | });
  604 | 
  605 | test.describe('right-to-left', () => {
  606 |   const ar = BUILD.locales.find((l) => l.direction === 'rtl');
  607 |   test.skip(!ar, 'no right-to-left locale in this build');
  608 |   test.use({ viewport: { width: 1280, height: 800 } });
  609 | 
  610 |   test('← goes to the next work in reading order (§11.3)', async ({ page }) => {
  611 |     const arWorks = listWorks(ar!.code);
  612 |     test.skip(arWorks.length < 2, 'needs two works');
  613 |     await gotoList(page, `${BASE}/${ar!.pathPrefix}/prompts/`);
  614 |     await page
  615 |       .locator(`[role="feed"] a[href="${detailUrl(arWorks[0]!.slug, ar!.pathPrefix)}"]`)
  616 |       .first()
  617 |       .click();
  618 |     await expectOpen(page, arWorks[0]!.slug, ar!.pathPrefix);
  619 |     await page.keyboard.press('ArrowLeft');
  620 |     await expectOpen(page, arWorks[1]!.slug, ar!.pathPrefix);
  621 |     await page.keyboard.press('ArrowRight');
  622 |     await expectOpen(page, arWorks[0]!.slug, ar!.pathPrefix);
  623 |   });
  624 | });
  625 | 
  626 | test.describe('phone', () => {
  627 |   // As the other phone tests: no isMobile (unsupported in Firefox); buttons are tapped.
  628 |   test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  629 | 
  630 |   /** A one-finger swipe on the popup, as touch events (Chromium builds Touch objects). */
  631 |   async function swipe(page: Page, from: [number, number], to: [number, number], ms = 160) {
  632 |     await page.evaluate(
  633 |       async ([[x0, y0], [x1, y1], duration]) => {
  634 |         const target = document.elementFromPoint(x0!, y0!)!;
  635 |         const touch = (x: number, y: number) =>
  636 |           new Touch({ identifier: 1, target, clientX: x, clientY: y, pageX: x, pageY: y });
  637 |         const fire = (type: string, x: number, y: number, end = false) =>
  638 |           target.dispatchEvent(
  639 |             new TouchEvent(type, {
  640 |               bubbles: true,
  641 |               cancelable: true,
  642 |               touches: end ? [] : [touch(x, y)],
  643 |               targetTouches: end ? [] : [touch(x, y)],
  644 |               changedTouches: [touch(x, y)],
  645 |             }),
  646 |           );
  647 |         fire('touchstart', x0!, y0!);
  648 |         const steps = 8;
  649 |         for (let i = 1; i <= steps; i += 1) {
  650 |           await new Promise((r) => setTimeout(r, (duration as number) / steps));
  651 |           fire('touchmove', x0! + ((x1! - x0!) * i) / steps, y0! + ((y1! - y0!) * i) / steps);
  652 |         }
  653 |         fire('touchend', x1!, y1!, true);
  654 |       },
  655 |       [from, to, ms] as const,
  656 |     );
  657 |   }
  658 | 
  659 |   test('swipe sideways switches works, down closes; edge swipes stay with the system (§11.3)', async ({
```