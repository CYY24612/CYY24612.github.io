#!/usr/bin/env python3
"""
CYY Portfolio - 站点图标生成器
生成 favicon.ico(16/32/48)、assets/apple-touch-icon.png(180)、assets/favicon.svg

风格:
  terminal  - 深蓝黑圆角方块 + 金色终端提示符 >_  (初版)
  chip      - 深蓝黑圆角方块 + 金色芯片图案       (备选 1)
  wave      - 深蓝黑圆角方块 + 金色示波器波形      (备选 2, 默认)

用法: python scripts/gen-icons.py [--style terminal|chip|wave] [--out-dir .]
"""
import argparse
import io
import math
import os
import struct
from PIL import Image, ImageDraw

BG = (14, 17, 23, 255)          # 深蓝黑 #0e1117
GOLD = (230, 184, 76, 255)      # 金色 呼应站点 accent
GOLD_SOFT = (230, 184, 76, 110)  # 金色描边(半透明)


def draw_icon(size, style, ss=8):
    """超采样绘制单尺寸图标"""
    S = size * ss
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    scale = S / 32.0
    r = int(7 * scale)

    # 背景圆角方块 + 细金色描边
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=r, fill=BG)
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=r,
                        outline=GOLD_SOFT, width=max(1, S // 96))

    if style == 'terminal':
        # 终端提示符 >_  (viewBox 32 坐标系)
        w = int(3.4 * scale)
        d.line([(9 * scale, 10.5 * scale), (17 * scale, 16 * scale),
                (9 * scale, 21.5 * scale)], fill=GOLD, width=w, joint='curve')
        d.line([(18.5 * scale, 22.2 * scale), (25.5 * scale, 22.2 * scale)],
               fill=GOLD, width=w)
    elif style == 'chip':
        # 芯片本体
        w = int(2 * scale)
        d.rounded_rectangle([9 * scale, 9 * scale, 23 * scale, 23 * scale],
                            radius=int(2 * scale), outline=GOLD, width=w)
        # 四边引脚
        pins = [(4, 11), (4, 16), (4, 21),
                (28, 11), (28, 16), (28, 21),
                (11, 4), (16, 4), (21, 4),
                (11, 28), (16, 28), (21, 28)]
        for px, py in pins:
            d.line([((px - 3) * scale, py * scale), ((px + 3) * scale, py * scale)],
                   fill=GOLD, width=w)
    else:  # wave - 示波器正弦波
        w = int(2.6 * scale)
        pts = []
        for x in range(4, 28):
            y = 20 - 7 * math.sin((x - 4) / 24 * 4 * math.pi)
            pts.append((x * scale, y * scale))
        d.line(pts, fill=GOLD, width=w, joint='curve')

    return img.resize((size, size), Image.LANCZOS)


def svg(style):
    """矢量版本, 供现代浏览器优先使用"""
    if style == 'terminal':
        body = (
            '<path d="M9 10.5 L17 16 L9 21.5" fill="none" '
            'stroke="#e6b84c" stroke-width="3.4" stroke-linecap="round" '
            'stroke-linejoin="round"/>\n'
            '  <line x1="18.5" y1="22.2" x2="25.5" y2="22.2" '
            'stroke="#e6b84c" stroke-width="3.4" stroke-linecap="round"/>'
        )
    elif style == 'chip':
        body = (
            '<rect x="9" y="9" width="14" height="14" rx="2" fill="none" '
            'stroke="#e6b84c" stroke-width="2"/>\n'
            '  <g stroke="#e6b84c" stroke-width="2" stroke-linecap="round">\n'
            '    <line x1="4" y1="11" x2="8" y2="11"/><line x1="4" y1="16" x2="8" y2="16"/><line x1="4" y1="21" x2="8" y2="21"/>\n'
            '    <line x1="24" y1="11" x2="28" y2="11"/><line x1="24" y1="16" x2="28" y2="16"/><line x1="24" y1="21" x2="28" y2="21"/>\n'
            '    <line x1="11" y1="4" x2="11" y2="8"/><line x1="16" y1="4" x2="16" y2="8"/><line x1="21" y1="4" x2="21" y2="8"/>\n'
            '    <line x1="11" y1="24" x2="11" y2="28"/><line x1="16" y1="24" x2="16" y2="28"/><line x1="21" y1="24" x2="21" y2="28"/>\n'
            '  </g>'
        )
    else:
        # wave - 示波器正弦波
        body = (
            '<path d="M4 20 C 7.5 12, 10.5 12, 14 20 C 17.5 28, 20.5 28, 24 20 '
            'C 25.5 16, 26.5 16, 28 20" fill="none" '
            'stroke="#e6b84c" stroke-width="2.6" stroke-linecap="round"/>'
        )
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="#0e1117"/>
  <rect width="32" height="32" rx="7" fill="none" stroke="#e6b84c" stroke-opacity="0.43"/>
  {body}
</svg>
'''


def save_ico(path, images):
    """多尺寸 ICO(内嵌 PNG, Vista+ 支持)。images: [(size, PIL.Image)], size 为 int 或 (w, h)"""
    entries, datas, offset = [], [], 6 + 16 * len(images)
    for size, im in images:
        w = h = size if isinstance(size, int) else size[0]
        buf = io.BytesIO()
        im.save(buf, format='PNG')
        data = buf.getvalue()
        entries.append(struct.pack('<BBBBHHII',
                                   w if w < 256 else 0, h if h < 256 else 0,
                                   0, 0, 1, 32, len(data), offset))
        datas.append(data)
        offset += len(data)
    with open(path, 'wb') as f:
        f.write(struct.pack('<HHH', 0, 1, len(images)))
        for e in entries:
            f.write(e)
        for d in datas:
            f.write(d)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--style', choices=['terminal', 'chip', 'wave'], default='wave')
    parser.add_argument('--out-dir', default='.')
    args = parser.parse_args()

    out = args.out_dir
    save_ico(os.path.join(out, 'favicon.ico'),
             [(s, draw_icon(s, args.style)) for s in (16, 32, 48)])
    draw_icon(180, args.style).save(os.path.join(out, 'assets', 'apple-touch-icon.png'))
    with open(os.path.join(out, 'assets', 'favicon.svg'), 'w', encoding='utf-8') as f:
        f.write(svg(args.style))
    print(f'[gen-icons] done: favicon.ico(16/32/48), assets/apple-touch-icon.png(180), assets/favicon.svg [{args.style}]')


if __name__ == '__main__':
    main()
