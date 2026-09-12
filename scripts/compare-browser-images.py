"""Bound Chrome edge rasterization noise; requires Pillow for optional visual checks only."""
import json
import sys
from PIL import Image, ImageChops


def compare(before_path, after_path):
    with Image.open(before_path) as before, Image.open(after_path) as after:
        if before.size != after.size or before.mode != 'RGB' or after.mode != 'RGB':
            raise ValueError('Expected equally sized RGB Chrome screenshots')
        difference = ImageChops.difference(before, after)
        bounds = difference.getbbox()
        values = list(difference.crop(bounds).getdata()) if bounds else []
        peaks = [max(pixel) for pixel in values if any(pixel)]
        result = {'pixels': len(peaks), 'strongPixels': sum(peak > 1 for peak in peaks),
                  'maxChannelDelta': max(peaks, default=0)}
        # Same-code controls showed sparse antialiasing differences, up to 20/255.
        # State, geometry and font comparisons remain exact in the Node runner.
        result['accepted'] = (result['pixels'] <= 64 and result['strongPixels'] <= 20
                              and result['maxChannelDelta'] <= 20)
        return result


if __name__ == '__main__':
    result = compare(*sys.argv[1:])
    print(json.dumps(result))
    sys.exit(0 if result['accepted'] else 1)
