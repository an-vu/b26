#!/usr/bin/env python3
"""Check the Obsidian code map (BlueBerry 26.canvas) against the repo.

Reports: links to files that no longer exist, source files with no card, arrows pointing at
missing cards, overlapping cards, and cards without a "Why" line.

Usage: python3 scripts/check-canvas-map.py "/path/to/BlueBerry 26.canvas"
"""
import glob
import json
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main(canvas_path: str) -> int:
    canvas = json.load(open(canvas_path))
    cards = [n for n in canvas['nodes'] if n['type'] == 'text']
    ids = {n['id'] for n in canvas['nodes']}
    blob = json.dumps(canvas)

    links = set(re.findall(r'file://(/[^)\s"]+)', blob))
    dead = sorted(p for p in links if not os.path.exists(p))

    named = {os.path.basename(p) for p in links} | set(re.findall(r'[\w.-]+\.(?:ts|java|sql|css)', blob))
    sources = [f for f in glob.glob(f'{REPO}/frontend/src/app/**/*.ts', recursive=True)
               + glob.glob(f'{REPO}/backend/src/main/java/**/*.java', recursive=True)
               if not f.endswith('.spec.ts')]
    unmapped = sorted(os.path.relpath(f, REPO) for f in sources if os.path.basename(f) not in named)

    dangling = [e['id'] for e in canvas['edges'] if e['fromNode'] not in ids or e['toNode'] not in ids]
    overlaps = [(a['id'], b['id']) for i, a in enumerate(cards) for b in cards[i + 1:]
                if a['x'] < b['x'] + b['width'] and b['x'] < a['x'] + a['width']
                and a['y'] < b['y'] + b['height'] and b['y'] < a['y'] + a['height']]
    no_why = [n['id'] for n in cards if '**Why' not in n['text'] and len(n['text']) > 250]

    print(f'{len(cards)} cards, {len(canvas["edges"])} arrows')
    for title, items in [('Links to deleted files', dead), ('Source files with no card', unmapped),
                         ('Arrows to missing cards', dangling), ('Overlapping cards', overlaps),
                         ('Long cards without a Why line', no_why)]:
        print(f'\n{title}: {len(items)}')
        for item in items[:40]:
            print(f'  - {item}')
    return 1 if dead or dangling or overlaps else 0


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    sys.exit(main(sys.argv[1]))
