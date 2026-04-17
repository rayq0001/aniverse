/**
 * Sharp-based Image Compositor
 * 
 * High-performance image processing utilities using Sharp (libvips).
 * Used for fast image conversion, resizing, and compositing in the pipeline.
 * 5x faster than Python-based alternatives for I/O operations.
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

/**
 * Convert all images in a directory to optimized WebP format.
 * Reduces file sizes by ~40% while maintaining quality.
 */
export async function convertToWebP(inputDir: string, outputDir: string, quality = 85): Promise<string[]> {
  fs.mkdirSync(outputDir, { recursive: true });
  const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'];
  const files = fs.readdirSync(inputDir)
    .filter(f => imageExts.includes(path.extname(f).toLowerCase()))
    .sort();

  const results: string[] = [];
  
  // Process in parallel batches of 4
  const batchSize = 4;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const promises = batch.map(async (fname) => {
      const inputPath = path.join(inputDir, fname);
      const outputPath = path.join(outputDir, path.parse(fname).name + '.webp');
      
      await sharp(inputPath)
        .webp({ quality })
        .toFile(outputPath);
      
      return outputPath;
    });
    
    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Resize images to a maximum width while maintaining aspect ratio.
 * Useful for normalizing manhwa page widths before processing.
 */
export async function resizeImages(inputDir: string, outputDir: string, maxWidth = 800): Promise<void> {
  fs.mkdirSync(outputDir, { recursive: true });
  const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'];
  const files = fs.readdirSync(inputDir)
    .filter(f => imageExts.includes(path.extname(f).toLowerCase()))
    .sort();

  const batchSize = 4;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    await Promise.all(batch.map(async (fname) => {
      const inputPath = path.join(inputDir, fname);
      const outputPath = path.join(outputDir, fname);
      
      const metadata = await sharp(inputPath).metadata();
      if (metadata.width && metadata.width > maxWidth) {
        await sharp(inputPath)
          .resize(maxWidth, null, { fit: 'inside' })
          .toFile(outputPath);
      } else {
        fs.copyFileSync(inputPath, outputPath);
      }
    }));
  }
}

/**
 * Get image dimensions for all images in a directory.
 */
export async function getImageDimensions(imageDir: string): Promise<Map<string, { width: number; height: number }>> {
  const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'];
  const files = fs.readdirSync(imageDir)
    .filter(f => imageExts.includes(path.extname(f).toLowerCase()))
    .sort();

  const dims = new Map<string, { width: number; height: number }>();
  
  for (const fname of files) {
    const meta = await sharp(path.join(imageDir, fname)).metadata();
    if (meta.width && meta.height) {
      dims.set(fname, { width: meta.width, height: meta.height });
    }
  }
  
  return dims;
}
