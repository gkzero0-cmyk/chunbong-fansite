from pathlib import Path
from PIL import Image, ImageFilter
import pillow_avif  # noqa: F401 - registers AVIF support with Pillow

ASSET_DIR = Path('assets/tarot/hd')
SOURCE_SIZE = (640, 480)
TARGET_SIZE = (1280, 960)


def upscale_pair(path: Path) -> bool:
    with Image.open(path) as source:
        image = source.convert('RGB')
        if image.size == TARGET_SIZE:
            return False
        if image.size != SOURCE_SIZE:
            raise RuntimeError(f'{path}: unexpected source size {image.size}, expected {SOURCE_SIZE}')
        image = image.resize(TARGET_SIZE, Image.Resampling.LANCZOS)
        image = image.filter(ImageFilter.UnsharpMask(radius=1.15, percent=115, threshold=2))
        temp = path.with_suffix('.tmp.avif')
        image.save(
            temp,
            format='AVIF',
            quality=88,
            speed=4,
            subsampling='4:4:4',
        )
    temp.replace(path)
    return True


def main() -> None:
    assets = sorted(ASSET_DIR.glob('pair-*.avif'))
    if len(assets) != 39:
        raise RuntimeError(f'expected 39 tarot pair assets, found {len(assets)}')
    changed = 0
    for path in assets:
        changed += int(upscale_pair(path))
    print(f'UPSCALED_PAIRS={changed}')


if __name__ == '__main__':
    main()
