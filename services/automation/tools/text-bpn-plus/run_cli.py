"""
text-bpn-plus CLI wrapper — Tile-Based Fast Detection
Usage: python run_cli.py --input <images_dir> --output <masks_dir>

Optimized pipeline:
  1. Splits tall manhwa pages into overlapping tiles (~1024px)
  2. Runs OCR model only on each tile (much faster than full image)
  3. Stitches tile masks back into full-page mask
  4. Applies morphological refinement (tight dilation around text only)
  5. Saves pixel-precise masks that protect faces/backgrounds
"""
import argparse
import os
import sys
import shutil
import time

import numpy as np
import cv2


def log(message: str):
    print(message, flush=True)


def find_model():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [f for f in os.listdir(script_dir) if 'ocr' in f.lower() and f.endswith(('.onnx', 'onnx copy'))]
    if not candidates:
        return None
    for c in candidates:
        if c.endswith(' copy'):
            src = os.path.join(script_dir, c)
            dst = os.path.join(script_dir, c.replace(' copy', ''))
            if not os.path.exists(dst):
                shutil.copy2(src, dst)
            return dst
        return os.path.join(script_dir, c)
    return None


# --------------- Tile-Based Detection ---------------

TILE_HEIGHT = 1024      # Height of each tile in pixels
TILE_OVERLAP = 128      # Overlap between tiles to avoid cutting text
MODEL_INPUT_SIZE = 640  # OCR model input resolution
DETECT_THRESHOLD = 0.3  # Lower threshold catches faint/partial text
DILATION_KERNEL = 11    # Larger kernel to fully cover text strokes + edges
DILATION_ITERS = 2      # Two passes for thorough coverage


def split_into_tiles(img):
    """Split a tall image into overlapping tiles."""
    h, w = img.shape[:2]
    tiles = []
    y = 0
    while y < h:
        y_end = min(y + TILE_HEIGHT, h)
        tile = img[y:y_end, :]
        tiles.append({
            'image': tile,
            'y_start': y,
            'y_end': y_end,
            'height': y_end - y,
            'width': w,
        })
        if y_end >= h:
            break
        y += TILE_HEIGHT - TILE_OVERLAP
    return tiles


def run_model_once(img_bgr, session, target_h, target_w):
    """Run OCR model and return raw float mask at (target_h, target_w)."""
    inp = cv2.resize(img_bgr, (MODEL_INPUT_SIZE, MODEL_INPUT_SIZE))
    inp = inp.astype(np.float32) / 255.0
    inp = np.transpose(inp, (2, 0, 1))[np.newaxis]  # NCHW

    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: inp})
    raw = outputs[0][0]
    if raw.ndim == 3:
        raw = raw[0]
    # Resize raw float confidence map to target size
    raw_resized = cv2.resize(raw, (target_w, target_h), interpolation=cv2.INTER_LINEAR)
    return raw_resized


def detect_text_in_tile(tile_img, session):
    """Run OCR model on a tile at multiple scales, merge results."""
    h, w = tile_img.shape[:2]
    try:
        # Scale 1: normal
        raw1 = run_model_once(tile_img, session, h, w)

        # Scale 2: 1.5x zoom on center crop (catches small text)
        ch, cw = int(h * 0.67), int(w * 0.67)
        y0, x0 = (h - ch) // 2, (w - cw) // 2
        crop = tile_img[y0:y0+ch, x0:x0+cw]
        raw2_crop = run_model_once(crop, session, ch, cw)
        raw2 = np.zeros((h, w), dtype=np.float32)
        raw2[y0:y0+ch, x0:x0+cw] = raw2_crop

        # Merge: take maximum confidence from both scales
        merged = np.maximum(raw1, raw2)
        mask = (merged > DETECT_THRESHOLD).astype(np.uint8) * 255
        return mask
    except Exception as e:
        print(f"[text-bpn-plus] Tile inference error: {e}", file=sys.stderr)
        return np.zeros((h, w), dtype=np.uint8)


def stitch_tile_masks(tiles, masks, full_h, full_w):
    """Stitch tile masks back into a full-page mask with overlap blending."""
    full_mask = np.zeros((full_h, full_w), dtype=np.uint8)

    for tile_info, mask in zip(tiles, masks):
        y_start = tile_info['y_start']
        y_end = tile_info['y_end']
        region = full_mask[y_start:y_end, :]
        full_mask[y_start:y_end, :] = np.maximum(region, mask)

    return full_mask


def refine_mask(mask):
    """Thorough morphological refinement for complete text coverage.

    Steps:
    1. Close small gaps within text (fills holes in thin strokes)
    2. Dilate to fully cover text + anti-aliased edges
    3. Remove noise blobs
    """
    # Step 1: Close gaps — connects broken strokes, fills small holes
    close_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, close_kernel, iterations=1)

    # Step 2: Dilate to cover text edges + anti-aliasing
    dilate_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (DILATION_KERNEL, DILATION_KERNEL))
    mask = cv2.dilate(mask, dilate_kernel, iterations=DILATION_ITERS)

    # Step 3: Remove small noise blobs (< 100 pixels)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for cnt in contours:
        if cv2.contourArea(cnt) < 100:
            cv2.drawContours(mask, [cnt], -1, 0, -1)

    return mask


def detect_full_page(img, session):
    """Full pipeline: split -> detect per tile -> stitch -> refine."""
    h, w = img.shape[:2]
    tiles = split_into_tiles(img)

    tile_masks = []
    for tile_info in tiles:
        tile_mask = detect_text_in_tile(tile_info['image'], session)
        tile_masks.append(tile_mask)

    full_mask = stitch_tile_masks(tiles, tile_masks, h, w)
    full_mask = refine_mask(full_mask)
    return full_mask


# --------------- Main Processing ---------------

def process(input_dir, output_dir):
    try:
        import onnxruntime as ort
    except ImportError:
        print("[text-bpn-plus] onnxruntime not installed — skipping detection, copying blanks.", file=sys.stderr)
        ort = None

    os.makedirs(output_dir, exist_ok=True)

    model_path = find_model()
    session = None
    if ort and model_path and os.path.exists(model_path):
        log(f"[text-bpn-plus] Loading model: {model_path}")
        session = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])
    else:
        print("[text-bpn-plus] No model found — generating empty masks (fallback).", file=sys.stderr)

    image_exts = ('.jpg', '.jpeg', '.png', '.webp', '.bmp')
    images = [f for f in sorted(os.listdir(input_dir)) if f.lower().endswith(image_exts)]

    if not images:
        for sub in sorted(os.listdir(input_dir)):
            sub_path = os.path.join(input_dir, sub)
            if os.path.isdir(sub_path):
                sub_out = os.path.join(output_dir, sub)
                process(sub_path, sub_out)
        return

    log(f"[text-bpn-plus] Processing {len(images)} images (tile-based detection)")
    start_time = time.time()

    for index, fname in enumerate(images, start=1):
        src_path = os.path.join(input_dir, fname)
        out_path = os.path.join(output_dir, os.path.splitext(fname)[0] + '_mask.png')

        img = cv2.imread(src_path)
        if img is None:
            print(f"[text-bpn-plus] Could not read {fname}", file=sys.stderr)
            continue

        if session:
            mask = detect_full_page(img, session)
        else:
            mask = np.zeros((img.shape[0], img.shape[1]), dtype=np.uint8)

        cv2.imwrite(out_path, mask)

        elapsed = time.time() - start_time
        avg_per_image = elapsed / index
        remaining = avg_per_image * (len(images) - index)
        log(f"[text-bpn-plus] [{index}/{len(images)}] {fname} ({elapsed:.1f}s elapsed, ~{remaining:.0f}s left)")

    total_time = time.time() - start_time
    log(f"[text-bpn-plus] Done. {len(images)} masks in {total_time:.1f}s ({total_time/len(images):.1f}s/image)")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Tile-based text detection for manga/manhwa')
    parser.add_argument('--input',  required=True, help='Input directory with images')
    parser.add_argument('--output', required=True, help='Output directory for mask images')
    args = parser.parse_args()
    process(args.input, args.output)
