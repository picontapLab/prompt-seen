# Portuguese GIF playback verification

Reviewer: AI Codex translate_b — Chromium timed-playback visual review
Reviewed: 2026-11-11T12:59:01.141Z
Browser: Chromium 156.0.8078.4

All 38 GIF assets were loaded as real img elements over a temporary localhost HTTP server in Chromium with prefers-reduced-motion set to no-preference. The server and browser were closed after sampling. 160 scheduled first/middle/last/cycle-boundary screenshots plus 10 supplementary action screenshots were captured. All 14 contact sheets were then opened with view_image and visually checked against the current Portuguese alt values. All 170 screenshots exactly match decoded source-frame pixels (mean pixel error 0); natural dimensions match the manifest and source file byte hashes were rechecked.

This is browser timed-sampling playback review, not human real-time viewing or a native Portuguese human review. Key-moment sampling supplements the separately completed all-frame reviews; it does not replace them.

## Result

No sampled action or playback-state contradiction with the reviewed Portuguese alt was found. The 34 repeating animations restart; a_479, a_480, a_503 and a_510 hold their final poses after one cycle, including samples at 1.5 and more than 2 cycle durations. Thus their once-only description is supported by actual browser behavior. The manifest loop=1 value is decoded metadata, not a reason to infer an extra browser replay.

The first a_509 screenshot was delayed to frame 4 (22–314 ms capture interval); that observation is retained. A supplemental 19–98 ms capture produced the exact initial frame. Supplemental captures also verify tears, airborne papers, tucked rotation, waving, notebook/owl blinking, airborne entrance, anime blinking, cat wink and wizard sparkles.

## Reviewed sheets

- /private/tmp/pt-br-localization-20261111/gif-browser-playback/sheet-01.jpg: a_382, a_384, a_385
- /private/tmp/pt-br-localization-20261111/gif-browser-playback/sheet-02.jpg: a_386, a_387, a_389
- /private/tmp/pt-br-localization-20261111/gif-browser-playback/sheet-03.jpg: a_390, a_391, a_393
- /private/tmp/pt-br-localization-20261111/gif-browser-playback/sheet-04.jpg: a_394, a_396, a_397
- /private/tmp/pt-br-localization-20261111/gif-browser-playback/sheet-05.jpg: a_472, a_474, a_476
- /private/tmp/pt-br-localization-20261111/gif-browser-playback/sheet-06.jpg: a_477, a_478, a_479
- /private/tmp/pt-br-localization-20261111/gif-browser-playback/sheet-07.jpg: a_480, a_482, a_483
- /private/tmp/pt-br-localization-20261111/gif-browser-playback/sheet-08.jpg: a_484, a_485, a_486
- /private/tmp/pt-br-localization-20261111/gif-browser-playback/sheet-09.jpg: a_488, a_490, a_492
- /private/tmp/pt-br-localization-20261111/gif-browser-playback/sheet-10.jpg: a_494, a_496, a_497
- /private/tmp/pt-br-localization-20261111/gif-browser-playback/sheet-11.jpg: a_498, a_499, a_501
- /private/tmp/pt-br-localization-20261111/gif-browser-playback/sheet-12.jpg: a_503, a_505, a_507
- /private/tmp/pt-br-localization-20261111/gif-browser-playback/sheet-13.jpg: a_509, a_510
- /private/tmp/pt-br-localization-20261111/gif-browser-playback/supplement/sheet-01.jpg: a_384, a_385, a_393, a_394, a_397, a_472, a_501, a_503, a_507, a_509

## Per-asset observed playback

- a_382: 512×512, 6 frames, delays [300, 300, 300, 300, 300, 300] ms, 1800 ms per cycle, decoded loop=0. Monkey raises its lantern with eyes closed, then returns to the starting hold.
- a_384: 512×512, 6 frames, delays [300, 300, 300, 300, 300, 300] ms, 1800 ms per cycle, decoded loop=0. Office reaction droops, wipes tears in the supplementary sample, and returns to the hopeful pose.
- a_385: 512×512, 6 frames, delays [300, 300, 300, 300, 300, 300] ms, 1800 ms per cycle, decoded loop=0. Office worker celebrates; supplemental sample shows airborne blank papers, followed by seated reset.
- a_386: 512×512, 6 frames, delays [300, 300, 300, 300, 300, 300] ms, 1800 ms per cycle, decoded loop=0. White chicken changes foot and wing positions and ends smiling before reset.
- a_387: 512×512, 6 frames, delays [300, 300, 300, 300, 300, 300] ms, 1800 ms per cycle, decoded loop=0. Blue-haired rice-eating character closes eyes and lifts spoon; hair clip and apron remain visible.
- a_389: 512×512, 6 frames, delays [300, 300, 300, 300, 300, 300] ms, 1800 ms per cycle, decoded loop=0. Courtyard chicken opens then closes wings and returns to its initial pose.
- a_390: 512×512, 6 frames, delays [300, 300, 300, 300, 300, 300] ms, 1800 ms per cycle, decoded loop=0. Four diners remain seated; father raises food while mother lowers/nods her head.
- a_391: 512×512, 6 frames, delays [300, 300, 300, 300, 300, 300] ms, 1800 ms per cycle, decoded loop=0. Round mint fish keeps yellow hat and coral fins while its body subtly bobs.
- a_393: 512×512, 6 frames, delays [300, 300, 300, 300, 300, 300] ms, 1800 ms per cycle, decoded loop=0. Gymnast crouches, performs a tucked aerial rotation in the supplementary sample, and lands upright.
- a_394: 512×512, 6 frames, delays [300, 300, 300, 300, 300, 300] ms, 1800 ms per cycle, decoded loop=0. Green and orange robots preserve sides while stepping, lifting arms and drawing hands inward.
- a_396: 512×512, 6 frames, delays [300, 300, 300, 300, 300, 300] ms, 1800 ms per cycle, decoded loop=0. Pelican pedals a red bicycle; sunset and subject remain consistent across samples.
- a_397: 512×512, 6 frames, delays [300, 300, 300, 300, 300, 300] ms, 1800 ms per cycle, decoded loop=0. Pencil owl closes eyes in the supplemental sample and raises wings while remaining on the notebook.
- a_472: 443×443, 9 frames, delays [130, 120, 250, 250, 250, 250, 250, 250, 250] ms, 2000 ms per cycle, decoded loop=0. Character enters from empty canvas, jumps in the supplemental sample, exits partially and resets to empty.
- a_474: 362×362, 9 frames, delays [200, 400, 200, 400, 200, 200, 400, 200, 200] ms, 2400 ms per cycle, decoded loop=0. Monday caption stays present while weary character sits then stands again.
- a_476: 360×480, 9 frames, delays [130, 120, 250, 250, 250, 250, 250, 250, 250] ms, 2000 ms per cycle, decoded loop=0. Surf changes across the Golden Gate gouache scene before restart.
- a_477: 360×480, 9 frames, delays [130, 120, 250, 250, 250, 250, 250, 250, 250] ms, 2000 ms per cycle, decoded loop=0. Bicycle and visitors move through the Colosseum gouache scene before restart.
- a_478: 360×480, 9 frames, delays [130, 120, 250, 250, 250, 250, 250, 250, 250] ms, 2000 ms per cycle, decoded loop=0. Cherry petals and visitors move subtly around pagoda and Mount Fuji before restart.
- a_479: 392×392, 9 frames, delays [500, 500, 500, 1000, 500, 500, 500, 500, 500] ms, 5000 ms per cycle, decoded loop=1. Gray corridor encounter reaches a tilted empty corridor and stays on that final view beyond two nominal cycles.
- a_480: 320×569, 9 frames, delays [1250, 1250, 1250, 1250, 620, 1250, 1250, 1250, 630] ms, 10000 ms per cycle, decoded loop=1. Garden water montage progresses to a final splash and remains there beyond two nominal cycles.
- a_482: 362×362, 9 frames, delays [120, 240, 120, 240, 120, 120, 240, 120, 120] ms, 1440 ms per cycle, decoded loop=0. Dwarf turntable moves from front to rear and around to near-front, then restarts.
- a_483: 362×362, 9 frames, delays [120, 240, 120, 240, 120, 120, 240, 120, 120] ms, 1440 ms per cycle, decoded loop=0. Sword and mossy stone change orientation, then return to front.
- a_484: 362×362, 9 frames, delays [120, 240, 120, 240, 120, 120, 240, 120, 120] ms, 1440 ms per cycle, decoded loop=0. Motorbike turntable moves through front/rear/near-front views, then restarts.
- a_485: 362×362, 9 frames, delays [120, 240, 120, 240, 120, 120, 240, 120, 120] ms, 1440 ms per cycle, decoded loop=0. Seated cat rotates from front to rear to near-front, then restarts.
- a_486: 443×443, 9 frames, delays [130, 120, 250, 250, 250, 250, 250, 250, 250] ms, 2000 ms per cycle, decoded loop=0. Whale maid enjoys rice while the original Chinese caption remains present.
- a_488: 362×362, 9 frames, delays [200, 400, 200, 400, 200, 200, 400, 200, 200] ms, 2400 ms per cycle, decoded loop=0. Whale maid changes from tired to cheerful waving and back with the after-work caption.
- a_490: 362×362, 9 frames, delays [150, 300, 150, 300, 150, 150, 300, 150, 150] ms, 1800 ms per cycle, decoded loop=0. Basketball character dunks, then returns to the ready pose with the ball.
- a_492: 415×420, 9 frames, delays [200, 200, 200, 200, 200, 200, 200, 200, 200] ms, 1800 ms per cycle, decoded loop=0. Deadpan fox brings front paws together, lowers them and resets; Chinese caption remains visible.
- a_494: 443×443, 9 frames, delays [100, 100, 200, 200, 200, 200, 200, 200, 200] ms, 1600 ms per cycle, decoded loop=0. Penguin jumps happily and returns to neutral.
- a_496: 443×443, 9 frames, delays [100, 100, 200, 200, 200, 200, 200, 200, 200] ms, 1600 ms per cycle, decoded loop=0. Penguin stomps angrily then resets to neutral.
- a_497: 443×443, 9 frames, delays [100, 100, 200, 200, 200, 200, 200, 200, 200] ms, 1600 ms per cycle, decoded loop=0. Penguin cries then returns to neutral.
- a_498: 443×443, 9 frames, delays [100, 100, 200, 200, 200, 200, 200, 200, 200] ms, 1600 ms per cycle, decoded loop=0. Smiling penguin shifts wings and stance across the dance.
- a_499: 362×362, 9 frames, delays [150, 300, 150, 300, 150, 150, 300, 150, 150] ms, 1800 ms per cycle, decoded loop=0. Pixel swordsman produces a water sweep, then recovers to starting stance.
- a_501: 443×443, 9 frames, delays [350, 350, 90, 70, 100, 70, 90, 300, 580] ms, 2000 ms per cycle, decoded loop=0. Supplemental browser sample confirms closed-eye blink between open-eye poses.
- a_503: 362×362, 9 frames, delays [350, 100, 150, 150, 150, 150, 150, 400, 400] ms, 2000 ms per cycle, decoded loop=1. Supplemental sample confirms wink; Robin hat settles and remains on the cat beyond two nominal cycles.
- a_505: 443×443, 9 frames, delays [80, 70, 150, 150, 150, 150, 150, 150, 150] ms, 1200 ms per cycle, decoded loop=0. Chibi character jumps, then returns to the starting open-arm pose.
- a_507: 362×362, 9 frames, delays [100, 200, 100, 200, 100, 100, 200, 100, 100] ms, 1200 ms per cycle, decoded loop=0. Wizard rotates staff; supplemental browser sample shows golden sparkles.
- a_509: 443×443, 9 frames, delays [50, 50, 100, 100, 100, 100, 100, 100, 100] ms, 800 ms per cycle, decoded loop=0. Johnny Bravo changes steps and hip pose; supplemental fast capture confirms actual initial frame.
- a_510: 362×362, 9 frames, delays [150, 300, 150, 300, 150, 150, 300, 150, 150] ms, 1800 ms per cycle, decoded loop=1. Anime character nods/closes eyes and holds closed eyes beyond two nominal cycles.

## Limits and reproducibility

- Chromium only; not Firefox/WebKit playback verification.
- Timed screenshots sample key moments; they are not continuous real-time human viewing and do not prove every transition is smooth.
- Per-capture beforeMs/afterMs records timing uncertainty. First a_509 sample was late (frame 4); a supplementary browser capture verified frame 1 without discarding the late sample.
- Frame matching reports the first identical decoded frame, so repeated identical poses may map to earlier frame numbers.
- Original GIFs and site build/dist were not modified; screenshot compositing was only for review contact sheets.

Exact source hashes, translated alt values, screenshot hashes, timing intervals and paths are in evidence.json. Capture scripts are ../gif-browser-sample.mjs and ../gif-browser-supplement.mjs; contact-sheet assembly scripts are ../gif-browser-sheets.mjs and ../gif-supplement-sheets.mjs. No build/dist or original GIF changes were made.
