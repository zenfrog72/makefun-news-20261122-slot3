#!/usr/bin/env python3
"""Downscale the 4x render with Pillow's Lanczos filter.

Usage: downscale.py <src-4096.png> <out-1024.png> <out-300.png>
Deterministic: the same input bytes always produce the same outputs.
"""
import sys

from PIL import Image


def main() -> None:
    src, out1024, out300 = sys.argv[1], sys.argv[2], sys.argv[3]
    im = Image.open(src)
    im.resize((1024, 1024), Image.LANCZOS).save(out1024, optimize=True)
    im.resize((300, 300), Image.LANCZOS).save(out300, optimize=True)
    print("downscaled", src, "->", out1024, "and", out300)


if __name__ == "__main__":
    main()
