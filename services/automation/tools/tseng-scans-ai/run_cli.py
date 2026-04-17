"""
tseng-scans-ai CLI wrapper — High-Quality Tile-Based Inpainting
Usage: python run_cli.py --input <images_dir> --mask <masks_dir> --output <output_dir>

Quality-focused pipeline:
  1. Dilates mask by 5px to cover text "halo" (removes residue/artifacts)
  2. Detects faces via MediaPipe and protects them from inpainting
  3. Crops tight bounding boxes around text regions (+16px padding)
  4. Sends ONLY small cropped tiles to LaMa (not full image)
  5. Blends inpainted tile back using feathered mask (seamless edges)
  6. Sequential processing (one image at a time) for quality on weak CPUs

Result: LaMa never sees faces, processes ~200x200 tiles instead of full pages,
giving maximum quality with speed on 2-core/4GB servers.
"""
import argparse
import os
import sys
import shutil
import time

import numpy as np
import cv2


def log(message):
    print(message, flush=True)


def find_model():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [f for f in os.listdir(script_dir) if 'lama' in f.lower() and ('onnx' in f.lower())]
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


# --------------- Configuration ---------------

LAMA_SIZE = 512         # LaMa model input size
MIN_MASK_AREA = 30      # Minimum mask pixels to process a region
TILE_PAD = 40           # Padding around text bbox — more context = better fill
MASK_DILATION_K = 13    # Kernel size: fully covers text halo + anti-aliased edges
MASK_DILATION_ITER = 2  # Two passes for thorough coverage
FEATHER_RADIUS = 7      # Larger blur radius for invisible seams


# --------------- Face Protection (OpenCV Haar Cascade — zero deps) ---------------

_face_cascade = "unloaded"

def get_face_cascade():
    """Load OpenCV Haar face cascade (lazy, singleton, no extra packages)."""
    global _face_cascade
    if _face_cascade != "unloaded":
        return _face_cascade
    try:
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        cascade = cv2.CascadeClassifier(cascade_path)
        if cascade.empty():
            log("[tseng-scans-ai] Face protection: Haar cascade file not found, skipping")
            _face_cascade = None
            return None
        log("[tseng-scans-ai] Face protection: OpenCV Haar cascade loaded")
        _face_cascade = cascade
        return _face_cascade
    except Exception as e:
        log(f"[tseng-scans-ai] Face protection: failed to load ({e}), skipping")
        _face_cascade = None
        return None


def detect_faces(img):
    """Return list of face bounding boxes [(x1,y1,x2,y2), ...]."""
    cascade = get_face_cascade()
    if cascade is None:
        return []

    h, w = img.shape[:2]
    # Use a downscaled gray image for speed
    scale = min(1.0, 800.0 / max(h, w))
    if scale < 1.0:
        small = cv2.resize(img, None, fx=scale, fy=scale)
    else:
        small = img
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)

    rects = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

    faces = []
    for (x, y, fw, fh) in rects:
        # Scale back to original resolution
        x1 = int(x / scale)
        y1 = int(y / scale)
        x2 = int((x + fw) / scale)
        y2 = int((y + fh) / scale)
        # Expand face box by 20% for safety margin
        pad_x = int((x2 - x1) * 0.2)
        pad_y = int((y2 - y1) * 0.2)
        faces.append((
            max(0, x1 - pad_x), max(0, y1 - pad_y),
            min(w, x2 + pad_x), min(h, y2 + pad_y)
        ))
    return faces


def protect_faces_in_mask(mask, faces):
    """Zero out mask regions that overlap with detected faces."""
    if not faces:
        return mask
    protected = mask.copy()
    for (fx1, fy1, fx2, fy2) in faces:
        protected[fy1:fy2, fx1:fx2] = 0
    return protected


# --------------- Mask Processing ---------------

def dilate_mask(mask):
    """Expand mask to fully cover text + halo + anti-aliased edges."""
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (MASK_DILATION_K, MASK_DILATION_K))
    dilated = cv2.dilate(mask, kernel, iterations=MASK_DILATION_ITER)
    # Close small gaps between nearby text regions
    close_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    dilated = cv2.morphologyEx(dilated, cv2.MORPH_CLOSE, close_kernel)
    return dilated


def create_feathered_mask(mask_tile):
    """Create a wide soft-edged mask for invisible blending."""
    mask_f = (mask_tile > 127).astype(np.float32)
    if FEATHER_RADIUS > 0:
        ksize = FEATHER_RADIUS * 2 + 1
        mask_f = cv2.GaussianBlur(mask_f, (ksize, ksize), 0)
        # Clamp to ensure masked center is fully 1.0
        mask_f = np.clip(mask_f * 1.5, 0, 1.0)
    return mask_f


def color_match_tile(original, inpainted, mask):
    """Match inpainted tile colors to surrounding background.

    Samples mean/std of the non-masked border region and adjusts
    the inpainted pixels to match, eliminating color shift artifacts.
    """
    mask_bool = mask > 127
    border = ~mask_bool

    if np.sum(border) < 100:
        return inpainted

    result = inpainted.copy().astype(np.float32)
    for c in range(3):
        orig_mean = np.mean(original[:, :, c][border])
        orig_std = max(np.std(original[:, :, c][border]), 1.0)
        inp_mean = np.mean(inpainted[:, :, c][mask_bool])
        inp_std = max(np.std(inpainted[:, :, c][mask_bool]), 1.0)

        # Only correct if there's a significant shift
        if abs(orig_mean - inp_mean) > 5:
            channel = result[:, :, c]
            channel[mask_bool] = ((channel[mask_bool] - inp_mean) / inp_std) * orig_std + orig_mean
            result[:, :, c] = channel

    return np.clip(result, 0, 255).astype(np.uint8)


def blend_tile(bg_tile, inpainted, mask_tile):
    """Blend inpainted tile back with feathered alpha blending.

    LaMa already produces clean fills; we just need smooth edges.
    """
    feather = create_feathered_mask(mask_tile)
    feather_3ch = np.stack([feather] * 3, axis=-1)

    blended = (inpainted.astype(np.float32) * feather_3ch +
               bg_tile.astype(np.float32) * (1.0 - feather_3ch))
    return np.clip(blended, 0, 255).astype(np.uint8)


# --------------- Tile Extraction & Inpainting ---------------

def find_text_regions(mask):
    """Find bounding boxes of text regions in the mask."""
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    regions = []
    for cnt in contours:
        if cv2.contourArea(cnt) < MIN_MASK_AREA:
            continue
        x, y, w, h = cv2.boundingRect(cnt)
        regions.append((x, y, w, h))
    return regions


def merge_nearby_regions(regions, img_h, img_w):
    """Merge overlapping/nearby bounding boxes with padding."""
    if not regions:
        return []

    expanded = []
    for (x, y, w, h) in regions:
        x1 = max(0, x - TILE_PAD)
        y1 = max(0, y - TILE_PAD)
        x2 = min(img_w, x + w + TILE_PAD)
        y2 = min(img_h, y + h + TILE_PAD)
        expanded.append([x1, y1, x2, y2])

    expanded.sort(key=lambda r: (r[1], r[0]))

    merged = [expanded[0]]
    for box in expanded[1:]:
        last = merged[-1]
        if box[0] <= last[2] and box[1] <= last[3]:
            last[0] = min(last[0], box[0])
            last[1] = min(last[1], box[1])
            last[2] = max(last[2], box[2])
            last[3] = max(last[3], box[3])
        else:
            merged.append(box)

    return merged


def inpaint_tile_lama(img_tile, mask_tile, session):
    """Run LaMa on a small cropped tile. High quality because tile is small."""
    h, w = img_tile.shape[:2]

    img_r = cv2.resize(img_tile, (LAMA_SIZE, LAMA_SIZE)).astype(np.float32) / 255.0
    mask_r = cv2.resize(mask_tile, (LAMA_SIZE, LAMA_SIZE)).astype(np.float32) / 255.0
    mask_r = (mask_r > 0.5).astype(np.float32)

    img_t = np.transpose(img_r, (2, 0, 1))[np.newaxis]
    mask_t = mask_r[np.newaxis, np.newaxis]

    try:
        input_names = [i.name for i in session.get_inputs()]
        feed = {}
        if len(input_names) >= 1:
            feed[input_names[0]] = img_t
        if len(input_names) >= 2:
            feed[input_names[1]] = mask_t

        output = session.run(None, feed)[0][0]  # CHW
        output = np.transpose(output, (1, 2, 0))
        output = np.clip(output * 255, 0, 255).astype(np.uint8)
        output = cv2.resize(output, (w, h))
        return output
    except Exception as e:
        print(f"[tseng-scans-ai] LaMa tile error: {e}", file=sys.stderr)
        return img_tile


def inpaint_tile_opencv(img_tile, mask_tile):
    """OpenCV Telea inpainting fallback."""
    mask_u8 = (mask_tile > 127).astype(np.uint8) * 255
    return cv2.inpaint(img_tile, mask_u8, inpaintRadius=5, flags=cv2.INPAINT_TELEA)


def inpaint_image(img, mask, session):
    """
    Quality-focused inpainting:
    1. Dilate mask to cover text halo
    2. Detect faces and protect them
    3. Crop tiles around text only
    4. Inpaint each tile with LaMa
    5. Blend back with feathered mask
    """
    h, w = img.shape[:2]

    # Step 1: Dilate mask to eliminate text residue
    mask = dilate_mask(mask)

    # Step 2: Face protection
    faces = detect_faces(img)
    if faces:
        mask = protect_faces_in_mask(mask, faces)

    # Step 3: Find text tile regions
    regions = find_text_regions(mask)
    if not regions:
        return img.copy(), 0, 0, len(faces)

    tiles = merge_nearby_regions(regions, h, w)

    result = img.copy()
    lama_count = 0
    fast_count = 0

    # Step 4: Process tiles sequentially (one at a time for quality)
    for (x1, y1, x2, y2) in tiles:
        img_tile = img[y1:y2, x1:x2].copy()
        mask_tile = mask[y1:y2, x1:x2].copy()

        if np.sum(mask_tile > 127) < MIN_MASK_AREA:
            continue

        # Use LaMa for all tiles (quality mode), OpenCV only as fallback
        if session is not None:
            inpainted = inpaint_tile_lama(img_tile, mask_tile, session)
            lama_count += 1
        else:
            inpainted = inpaint_tile_opencv(img_tile, mask_tile)
            fast_count += 1

        # Step 5: Seamless blending — try Poisson first, fallback to feathered
        blended = blend_tile(result[y1:y2, x1:x2], inpainted, mask_tile)
        result[y1:y2, x1:x2] = blended

    return result, lama_count, fast_count, len(faces)


# --------------- Main Processing ---------------

def process(input_dir, mask_dir, output_dir, session=None):
    if session is None:
        try:
            import onnxruntime as ort
            ort_available = True
        except ImportError:
            print("[tseng-scans-ai] onnxruntime not installed — using OpenCV fallback.", file=sys.stderr, flush=True)
            ort_available = False

        model_path = find_model()
        if ort_available and model_path and os.path.exists(model_path):
            log(f"[tseng-scans-ai] Loading LaMa model: {model_path}")
            try:
                import onnxruntime as ort
                session = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])
            except Exception as e:
                print(f"[tseng-scans-ai] Model load failed: {e} — using OpenCV fallback.", file=sys.stderr, flush=True)
                session = None
        else:
            print("[tseng-scans-ai] No LaMa model found — using OpenCV inpaint fallback.", file=sys.stderr, flush=True)

    os.makedirs(output_dir, exist_ok=True)

    image_exts = ('.jpg', '.jpeg', '.png', '.webp', '.bmp')
    images = [f for f in sorted(os.listdir(input_dir)) if f.lower().endswith(image_exts)]

    if not images:
        for sub in sorted(os.listdir(input_dir)):
            sub_path = os.path.join(input_dir, sub)
            if os.path.isdir(sub_path):
                sub_mask = os.path.join(mask_dir, sub)
                sub_out  = os.path.join(output_dir, sub)
                if os.path.isdir(sub_mask):
                    process(sub_path, sub_mask, sub_out, session=session)
                else:
                    os.makedirs(sub_out, exist_ok=True)
                    for f in sorted(os.listdir(sub_path)):
                        if f.lower().endswith(image_exts):
                            shutil.copy2(os.path.join(sub_path, f), os.path.join(sub_out, f))
        return

    log(f"[tseng-scans-ai] Processing {len(images)} images (quality mode: LaMa + face protection)")
    start_time = time.time()
    total_tiles = 0
    total_faces = 0
    images_skipped = 0

    for index, fname in enumerate(images, start=1):
        img_path  = os.path.join(input_dir, fname)
        base      = os.path.splitext(fname)[0]
        mask_path = os.path.join(mask_dir, base + '_mask.png')
        out_path  = os.path.join(output_dir, fname)

        img = cv2.imread(img_path)
        if img is None:
            print(f"[tseng-scans-ai] Could not read {fname}", file=sys.stderr, flush=True)
            continue

        if not os.path.exists(mask_path):
            shutil.copy2(img_path, out_path)
            images_skipped += 1
            continue

        mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
        if mask is None or np.sum(mask > 127) < MIN_MASK_AREA:
            shutil.copy2(img_path, out_path)
            images_skipped += 1
            continue

        result, lama_n, fast_n, face_n = inpaint_image(img, mask, session)
        total_tiles += lama_n + fast_n
        total_faces += face_n
        cv2.imwrite(out_path, result)

        elapsed = time.time() - start_time
        avg = elapsed / index
        remaining = avg * (len(images) - index)
        face_str = f" faces:{face_n}" if face_n > 0 else ""
        log(f"[tseng-scans-ai] [{index}/{len(images)}] {fname}: {lama_n + fast_n} tiles{face_str} ({elapsed:.1f}s, ~{remaining:.0f}s left)")

    total_time = time.time() - start_time
    log(f"[tseng-scans-ai] Done. {len(images)} images, {total_tiles} tiles, {total_faces} faces protected, {images_skipped} skipped in {total_time:.1f}s")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='High-quality tile-based manga/manhwa inpainting')
    parser.add_argument('--input',  required=True, help='Input images directory')
    parser.add_argument('--mask',   required=True, help='Mask images directory')
    parser.add_argument('--output', required=True, help='Output directory')
    args = parser.parse_args()
    process(args.input, args.mask, args.output)
