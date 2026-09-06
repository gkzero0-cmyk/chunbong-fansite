import io
import os
import subprocess
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
import pillow_avif  # noqa: F401 - registers AVIF support with Pillow
from basicsr.archs.rrdbnet_arch import RRDBNet
from realesrgan import RealESRGANer

ASSET_DIR = Path('assets/tarot/hd')
SOURCE_REF = '3247a55efbc9629b5707f975e779d3893d068ff5'
SOURCE_SIZE = (640, 480)
CARD_SOURCE_SIZE = (320, 480)
CARD_MODEL_SIZE = (1280, 1920)
MODEL_SIZE = (2560, 1920)
CARD_TARGET_SIZE = (960, 1440)
TARGET_SIZE = (1920, 1440)
MODEL_NAME = 'RealESRGAN_x4plus_anime_6B'
MODEL_PATH = Path(os.environ.get('TAROT_SUPERRES_MODEL', f'weights/{MODEL_NAME}.pth'))


def source_pair_bytes(filename: str) -> bytes:
    # Recover the untouched 640x480 source pair with `git show` instead of
    # feeding a previously interpolated 2x/3x asset back into the model.
    return subprocess.check_output([
        'git', 'show', f'{SOURCE_REF}:assets/tarot/hd/{filename}'
    ])


def create_upsampler() -> RealESRGANer:
    if not MODEL_PATH.exists():
        raise RuntimeError(f'missing Real-ESRGAN model: {MODEL_PATH}')
    model = RRDBNet(
        num_in_ch=3,
        num_out_ch=3,
        num_feat=64,
        num_block=6,
        num_grow_ch=32,
        scale=4,
    )
    return RealESRGANer(
        scale=4,
        model_path=str(MODEL_PATH),
        dni_weight=None,
        model=model,
        tile=256,
        tile_pad=16,
        pre_pad=0,
        half=False,
        gpu_id=None,
    )


def superresolve_card(card: Image.Image, upsampler: RealESRGANer) -> Image.Image:
    if card.size != CARD_SOURCE_SIZE:
        raise RuntimeError(f'unexpected card size {card.size}, expected {CARD_SOURCE_SIZE}')
    bgr = cv2.cvtColor(np.asarray(card.convert('RGB')), cv2.COLOR_RGB2BGR)
    output, _ = upsampler.enhance(bgr, outscale=4)
    rgb = cv2.cvtColor(output, cv2.COLOR_BGR2RGB)
    learned = Image.fromarray(rgb, mode='RGB')
    if learned.size != CARD_MODEL_SIZE:
        raise RuntimeError(f'unexpected model output {learned.size}, expected {CARD_MODEL_SIZE}')
    # Real-ESRGAN reconstructs detail at 4x first. Downsample only after that
    # learned pass so the final 3x-compatible card keeps cleaner edges/details.
    return learned.resize(CARD_TARGET_SIZE, Image.Resampling.LANCZOS)


def rebuild_pair(filename: str, target_path: Path, upsampler: RealESRGANer) -> None:
    source_bytes = source_pair_bytes(filename)
    with Image.open(io.BytesIO(source_bytes)) as source:
        pair = source.convert('RGB')
    if pair.size != SOURCE_SIZE:
        raise RuntimeError(f'{filename}: source size {pair.size}, expected {SOURCE_SIZE}')

    left_source = pair.crop((0, 0, CARD_SOURCE_SIZE[0], CARD_SOURCE_SIZE[1]))
    right_source = pair.crop((CARD_SOURCE_SIZE[0], 0, SOURCE_SIZE[0], SOURCE_SIZE[1]))
    left = superresolve_card(left_source, upsampler)
    right = superresolve_card(right_source, upsampler)

    # The learned 4x stage is 2560x1920 across the two reconstructed cards.
    if (left.width + right.width) * 4 // 3 != MODEL_SIZE[0]:
        raise RuntimeError('unexpected learned pair geometry')

    result = Image.new('RGB', TARGET_SIZE)
    result.paste(left, (0, 0))
    result.paste(right, (CARD_TARGET_SIZE[0], 0))
    temp = target_path.with_suffix('.tmp.avif')
    result.save(
        temp,
        format='AVIF',
        quality=98,
        speed=2,
        subsampling='4:4:4',
    )
    temp.replace(target_path)


def main() -> None:
    targets = sorted(ASSET_DIR.glob('pair-*.avif'))
    if len(targets) != 39:
        raise RuntimeError(f'expected 39 tarot pair assets, found {len(targets)}')

    upsampler = create_upsampler()
    for index, target_path in enumerate(targets, start=1):
        rebuild_pair(target_path.name, target_path, upsampler)
        print(f'SUPERRES_PAIR={index:02d}/39 {target_path.name}', flush=True)

    print(f'SUPERRES_MODEL={MODEL_NAME}')
    print(f'SOURCE_REF={SOURCE_REF}')
    print(f'SOURCE_SIZE={SOURCE_SIZE[0]}x{SOURCE_SIZE[1]}')
    print(f'MODEL_SIZE={MODEL_SIZE[0]}x{MODEL_SIZE[1]}')
    print(f'TARGET_SIZE={TARGET_SIZE[0]}x{TARGET_SIZE[1]}')


if __name__ == '__main__':
    main()
