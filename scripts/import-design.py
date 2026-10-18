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
    'single-location': ['info-tips', 'trends', 'competitors'],
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
        # Картки статусів: без «N of 14 locations · N states» (і без кнопки «View locations»);
        # загальна кількість локацій — квадратиком перед заголовком «All Locations»
        total = re.search(r'\d+ of (\d+) locations · \d+ states', html).group(1)
        html = re.sub(r'\n\s*<span class="absolute left-4 top-\[190px\][^>]*>\d+ of \d+ locations · \d+ states</span>', '', html)
        html = html.replace('<h1 class="frub text-[32px] font-semibold tracking-[-0.03em] text-[#072C4A]">All Locations</h1>',
                            '<h1 class="frub flex items-center gap-3 text-[32px] font-semibold tracking-[-0.03em] text-[#072C4A]">'
                            '<span title="Locations tracked" class="inline-flex h-[34px] min-w-[34px] items-center justify-center rounded-lg bg-[#F0F8FF] px-2 text-[18px] font-medium tracking-normal text-[#005E9D] shadow-[inset_0_0_0_1px_rgba(0,94,157,0.2)]">'
                            + total + '</span>All Locations</h1>', 1)

        # Примітка «#12 of 20 in local market» — кольором статусу локації (ті самі кольори, що й на карті)
        def note_color(row):
            st = re.search(r'text-\[#FAFAFA\] bg-\[(#[0-9A-Fa-f]{6})\]', row)
            return re.sub(r'style="color:#[0-9A-Fa-f]{6}">#', 'style="color:' + st.group(1) + '">#', row) if st else row
        html = re.sub(r'<tr\b.*?</tr>', lambda m: note_color(m.group(0)), html, flags=re.S)

        # Map Tracker: без заголовка, підзаголовка і кнопки Filter — блок починається одразу з таймлайну
        html = re.sub(r'\n\s*<div class="flex flex-col gap-3 px-6 pt-5 pb-3 sm:flex-row sm:items-start sm:justify-between">\s*<div>\s*<h2[^>]*>Map Tracker</h2>.*?<span>Filter</span></div>\s*</div>\s*</div>', '', html, count=1, flags=re.S)

        # Легенда карти (Strong / Average / Weak / Sleeping presence, No locations) — над картою, під таймлайном
        legend = re.search(r'\n\s*<div class="flex flex-wrap items-center gap-x-6 gap-y-2 px-6 pb-5 pt-1">.*?</div>', html, flags=re.S)
        html = html.replace(legend.group(0), '', 1)
        html = html.replace('<div id="map-timeline" class="mt-4 mb-5 px-2"></div>',
                            '<div id="map-timeline" class="mt-4 mb-3 px-2"></div>'
                            + legend.group(0).replace('px-6 pb-5 pt-1', 'px-2 pb-4'), 1)
        html = html.replace('<div id="map-timeline" class="mt-4 mb-3 px-2">', '<div id="map-timeline" class="mt-5 mb-3 px-2">', 1)

    if page == 'single-location':
        # Rank placement: лишаємо варіант A (Same row, wraps) — без перемикача й без варіантів B/C
        html = re.sub(r'\n\s*<div id="rank-var-switch"[^\n]*', '', html, count=1)
        html = re.sub(r'\n\s*<div data-rank-var="[bc]"[^\n]*', '', html)
        html = html.replace('<div data-rank-var="a" class=', '<div class=', 1)
        # Блок «Trends» (згортуваний) прибрано; trends.js пропускає його, якщо #trends-block немає
        html = re.sub(r'\n\s*<section id="trends-block".*?</section>', '', html, count=1, flags=re.S)
        # Nearest / All Competitors: кольори статусів (як у Leaderboard і на карті) замість відтінків синього,
        # а кругова діаграма — живий графік Chart.js (src/js/competitors.js) замість PNG
        for swatch, col in (('#0B2A45', '#074B34'), ('#0F5F9E', '#047857'), ('#1296DB', '#059669'),
                            ('#7EC8F7', '#F59E0B'), ('#C8E7FC', '#F87171'), ('#E6F3FE', '#9A9A9A')):
            html = re.sub(r'<div class="h-\[26px\] w-\[26px\] shrink-0 rounded-\[4px\] border border-\[#005E9D\]/50 bg-\[' + swatch + r'\]"></div>(.*?)<div class="h-full rounded-full bg-\[#005E9D\]" style="',
                          lambda m, col=col: '<div data-swatch class="h-[26px] w-[26px] shrink-0 rounded-[4px]" style="background:' + col + '"></div>' + m.group(1) + '<div class="h-full rounded-full" style="background:' + col + ';',
                          html, flags=re.S)
        html = re.sub(r'<img src="assets/img/donut-(nearest|tracking)\.png" alt="([^"]+)" class="absolute inset-0 block h-full w-full">',
                      r'<canvas data-donut="\1" role="img" aria-label="\2" class="absolute inset-0 block h-full w-full"></canvas>', html)

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
