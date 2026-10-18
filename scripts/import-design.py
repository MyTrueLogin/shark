#!/usr/bin/env python3
"""Convert the Claude Design export (design/export/*) into the Vite pages in the repo root.

Run after replacing files in design/export with a fresh export:
    python3 scripts/import-design.py

What it does per page:
  * drops the Tailwind browser CDN, the inline <style type="text/tailwindcss"> and the bundler thumbnail;
    links the compiled stylesheet src/styles/main.css instead;
  * replaces base64 SVG mask icons with `dc-icon i-<name>` classes (files in src/icons);
  * rewrites page links (../x/x.html -> x.html) and image paths (assets/... -> assets/img/...);
  * replaces design-only <script src> tags with ES modules from src/js.
"""
import base64
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'design' / 'export'

# Unique path fragment -> icon name
ICONS = {
    'M15.75 15.75L11.2501': 'search',
    'M11.7334 14.9833': 'settings',
    'M13 17.3333V13': 'info',
    'M6.14167 8.18348': 'dominant',
    'M7.53467 14.4099': 'shield',
    'M4.1001 2.93334': 'moderate',
    'M13.3333 13.3333V8.66667': 'bar',
    'M7.00008 4.66667': 'alert',
    'M0.600098 3.80001': 'comment',
    'M9 18L15 12L9 6': 'chevron-right',
    'M6.14334 1.14996': 'star',
    'M5.17785 7.63894': 'award',
}

PAGES = {
    'all-locations': ['info-tips', 'network'],
    'single-location': ['info-tips', 'trends', 'rank-switch'],
    'metrics': ['metrics'],
    'onboarding': [],
}

HEAD = '''    <link rel="icon" href="favicon.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="/src/styles/main.css" />
'''

used_icons = {}


def icon_name(b64):
    svg = base64.b64decode(b64).decode()
    for frag, name in ICONS.items():
        if frag in svg:
            used_icons[name] = svg
            return name
    raise SystemExit('Unknown icon, add it to ICONS: ' + svg[:200])


def convert_icons(html):
    def fix_tag(m):
        tag = m.group(0)
        found = re.findall(r'data:image/svg\+xml;base64,([A-Za-z0-9+/=]+)', tag)
        if not found:
            return tag
        name = icon_name(found[0])
        tag = re.sub(r'(-webkit-)?mask-image:url\(&quot;[^)]*&quot;\);?', '', tag)
        tag = tag.replace('style=";', 'style="').replace(';"', '"')
        tag = re.sub(r'class="dc-icon', 'class="dc-icon i-' + name, tag, count=1)
        return tag
    return re.sub(r'<i\b[^>]*>', fix_tag, html)


def convert(page, modules):
    html = (SRC / page / f'{page}.html').read_text()

    html = re.sub(r'\s*<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@[^"]+"></script>', '', html)
    html = re.sub(r'\s*<style type="text/tailwindcss">.*?</style>\n?', '\n' + HEAD, html, flags=re.S)
    html = re.sub(r'\s*<template id="__bundler_thumbnail">.*?</template>', '', html, flags=re.S)
    html = re.sub(r'\s*<link rel="preload" as="image" href="[^"]+"></link>', '', html)
    html = re.sub(r'\s*<script src="[^"]+\.js"></script>', '', html)
    html = re.sub(r'\s*<script>\(function\(\)\{var sw=.*?</script>', '', html, flags=re.S)

    html = convert_icons(html)

    html = re.sub(r'href="\.\./([\w-]+)/\1\.html', r'href="\1.html', html)
    html = re.sub(r'(src|href)="assets/(?!img/)', r'\1="assets/img/', html)

    if page == 'all-locations':
        # Блок «Status changes» поки прибрано (network.js пропускає його, якщо #status-changes немає)
        html = re.sub(r'\s*<section id="status-changes"[^>]*></section>', '', html)
        # Картка Strong — виділена синім і з назвою «Strong Presence» (як у робочій версії)
        html = html.replace('rounded-2xl bg-[#FAFAFA] shadow-[inset_0_0_0_1.3px_rgba(0,94,157,0.25)]">',
                            'rounded-2xl bg-[#B9E3FE] shadow-[inset_0_0_0_1.3px_rgba(7,44,74,0.25)]">', 1)
        html = html.replace('text-[#072C4A]">Strong</span><button type="button" data-info="strong"',
                            'text-[#072C4A]">Strong Presence</span><button type="button" data-info="strong"', 1)
        # Картки статусів: кнопка «View locations» (веде до Internal Leaderboard), картки на 36 px вищі
        html = html.replace('<article class="relative h-[271px] ', '<article class="relative h-[307px] ')
        html = html.replace('top-0 z-3 h-[235px] ', 'top-0 z-3 h-[271px] ')
        for st in ('strong', 'average', 'weak', 'sleeping'):
            html = re.sub(
                r'(<div data-card="' + st + r'".*?<span class="absolute left-4 top-\[190px\][^>]*>[^<]*</span>)',
                lambda m, st=st: m.group(1) + '\n                <a href="#location-leaderboard" data-view-status="' + st + '" class="group/vl absolute bottom-4 left-4 flex h-[26px] cursor-pointer items-center gap-0.5 rounded-lg bg-[#F0F8FF] px-2 no-underline shadow-[inset_0_0_0_0.8px_rgba(0,94,157,0.25)] transition-shadow hover:shadow-[inset_0_0_0_1px_rgba(0,94,157,0.5)]"><span class="text-[12px] font-medium text-[#072C4A]/85 group-hover/vl:text-[#005E9D]">View locations</span><i class="dc-icon i-chevron-right text-[#072C4A]/85 transition-transform group-hover/vl:translate-x-0.5 group-hover/vl:text-[#005E9D]" style="width:14px;height:14px"></i></a>',
                html, count=1, flags=re.S)

        # Легенда карти (Strong / Average / Weak / Sleeping presence, No locations) — над картою, під таймлайном
        legend = re.search(r'\n\s*<div class="flex flex-wrap items-center gap-x-6 gap-y-2 px-6 pb-5 pt-1">.*?</div>', html, flags=re.S)
        html = html.replace(legend.group(0), '', 1)
        html = html.replace('<div id="map-timeline" class="mt-4 mb-5 px-2"></div>',
                            '<div id="map-timeline" class="mt-4 mb-3 px-2"></div>'
                            + legend.group(0).replace('px-6 pb-5 pt-1', 'px-2 pb-4'), 1)

    # Підказки «i» — усі одного вигляду (варіант «corner» для Reputation більше не потрібен)
    html = html.replace(' data-tip="corner"', '')

    if page == 'onboarding':
        html = re.sub(r'<body( class=")?', lambda m: '<body class="page-onboarding ' if m.group(1) else '<body class="page-onboarding"', html, count=1)

    if page == 'metrics':
        html = metrics_shell(html)

    tags = ''.join(f'    <script type="module" src="/src/js/{m}.js"></script>\n' for m in modules)
    html = html.replace('  </body>', tags + '  </body>', 1)
    (ROOT / f'{page}.html').write_text(html)
    print('wrote', page + '.html')


def metrics_shell(html):
    """The export of Metrics is a pre-rendered table (and is cut off by the export size limit).
    Keep the page chrome and let src/js/metrics.js render the table from #metrics-data."""
    start = html.index('<table')
    html = html[:start] + '''<table id="daily-metrics" class="w-max min-w-full border-separate border-spacing-0 text-[12px] leading-[normal] font-normal text-[#072C4A]"></table>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    <script type="application/json" id="metrics-data">
''' + (ROOT / 'design' / 'metrics-demo.json').read_text() + '''    </script>
  </body>
</html>
'''
    # switcher buttons get data-metric keys
    keys = ['reviews', 'rating', 'services', 'service_details', 'service_media', 'service_categories',
            'attributes', 'profile_score', 'posts', 'last_review_age']
    it = iter(keys)
    html = re.sub(r'<button type="button" class="shrink-0 whitespace-nowrap',
                  lambda m: f'<button type="button" data-metric="{next(it)}" class="shrink-0 whitespace-nowrap', html)
    html = html.replace('22 profiles · 2026-09-01 → 2026-10-08', '')
    html = html.replace('<p class="mt-1 text-[14px] text-[#072C4A]/70"></p>', '<p id="metrics-subtitle" class="mt-1 text-[14px] text-[#072C4A]/70"></p>')
    return html


for page, modules in PAGES.items():
    convert(page, modules)

for name, svg in used_icons.items():
    (ROOT / 'src' / 'icons' / f'{name}.svg').write_text(svg)

img = ROOT / 'assets' / 'img'
img.mkdir(parents=True, exist_ok=True)
for f in (SRC / 'single-location' / 'assets').glob('*.png'):
    shutil.copy(f, img / f.name)

css = ''.join(f".i-{n} {{ --icon: url('../icons/{n}.svg'); }}\n" for n in sorted(used_icons))
(ROOT / 'src' / 'styles' / 'icons.css').write_text('/* generated by scripts/import-design.py */\n' + css)
print('icons:', ', '.join(sorted(used_icons)))
