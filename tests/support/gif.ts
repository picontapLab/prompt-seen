import sharp from 'sharp';

/** Two visibly different frames, with transparency and unequal delays. */
export async function animatedGif(width = 640, height = 480, loop = 0) {
  const pixels = Buffer.alloc(width * height * 2 * 4);
  for (let frame = 0; frame < 2; frame++) {
    for (let y = 10; y < height - 10; y++) {
      for (let x = 10; x < width - 10; x++) {
        const offset = ((frame * height + y) * width + x) * 4;
        pixels[offset + frame] = 255;
        pixels[offset + 3] = 255;
      }
    }
  }
  return sharp(pixels, { raw: { width, height: height * 2, channels: 4, pageHeight: height } })
    .gif({ delay: [120, 240], loop })
    .toBuffer();
}
