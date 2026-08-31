from pathlib import Path
from PIL import Image
import argparse
import io
import zipfile

SUITS = [('소드', 'swords'), ('완드', 'wands'), ('컵', 'cups'), ('펜타클', 'pentacles')]
RANKS = [('에이스', 'ace'), ('2', '02'), ('3', '03'), ('4', '04'), ('5', '05'), ('6', '06'), ('7', '07'), ('8', '08'), ('9', '09'), ('10', '10'), ('시종', 'page'), ('기사', 'knight'), ('여왕', 'queen'), ('왕', 'king')]


def convert(raw: bytes, dest: Path):
    with Image.open(io.BytesIO(raw)) as image:
        image = image.convert('RGB')
        if image.width > 1024:
            height = round(image.height * 1024 / image.width)
            image = image.resize((1024, height), Image.Resampling.LANCZOS)
        dest.parent.mkdir(parents=True, exist_ok=True)
        image.save(dest, 'WEBP', quality=88, method=4)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--major-zip', required=True)
    parser.add_argument('--minor-zip', required=True)
    parser.add_argument('--output', default='assets/tarot/hd')
    args = parser.parse_args()
    out = Path(args.output)

    with zipfile.ZipFile(args.major_zip) as archive:
        for number in range(22):
            convert(archive.read(f'{number}번.png'), out / f'major-{number:02d}.webp')

    with zipfile.ZipFile(args.minor_zip) as archive:
        for ko_suit, suit_id in SUITS:
            for ko_rank, rank_id in RANKS:
                convert(archive.read(f'{ko_suit} {ko_rank}.png'), out / f'{suit_id}-{rank_id}.webp')


if __name__ == '__main__':
    main()
