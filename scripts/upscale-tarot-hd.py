import os
from pathlib import Path
from PIL import Image, ImageFilter
import pillow_avif  # noqa: F401 - registers AVIF support with Pillow

ASSET_DIR = Path('assets/tarot/hd')
SOURCE_DIR = Path(os.environ.get('TAROT_SOURCE_DIR', ASSET_DIR))
SOURCE_SIZE = (640, 480)
TARGET_SIZE = (1920, 1440)


def upscale_pair(source_path: Path, target_path: Path) -> bool:
    with Image.open(source_path) as source:
        image = source.convert('RGB')
        if image.size != SOURCE_SIZE:
            raise RuntimeError(f'{source_path}: unexpected source size {image.size}, expected {SOURCE_SIZE}')
        image = image.resize(TARGET_SIZE, Image.Resampling.LANCZOS)
        image = image.filter(ImageFilter.UnsharpMask(radius=1.2, percent=125, threshold=2))
        temp = target_path.with_suffix('.tmp.avif')
        image.save(
            temp,
            format='AVIF',
            quality=92,
            speed=3,
            subsampling='4:4:4',
        )
    temp.replace(target_path)
    return True


def main() -> None:
    targets = sorted(ASSET_DIR.glob('pair-*.avif'))
    if len(targets) != 39:
        raise RuntimeError(f'expected 39 tarot pair assets, found {len(targets)}')
    source_paths = [SOURCE_DIR / target.name for target in targets]
    missing = [path for path in source_paths if not path.exists()]
    if missing:
        raise RuntimeError(f'missing tarot source assets: {missing[:3]}')
    changed = 0
    for source_path, target_path in zip(source_paths, targets):
        changed += int(upscale_pair(source_path, target_path))
    print(f'UPSCALED_PAIRS={changed}')
    print(f'TARGET_SIZE={TARGET_SIZE[0]}x{TARGET_SIZE[1]}')


if __name__ == '__main__':
    main()
