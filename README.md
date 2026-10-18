# Shark — верстка (відстеження видимості на Google Maps)

Верстку зібрано з дизайну в Claude Design («Shark: відстеження видимості на Maps»). Це статичні HTML-сторінки
на Tailwind CSS 4 і vanilla JS-модулях, зібрані через Vite. Їх можна віддавати фронтенду як є: розмітку переносять
у шаблони (Blade/Twig/React…), а дані підставляють із бекенду.

| Сторінка | Файл | Що там |
|---|---|---|
| Single Location | `single-location.html` | KPI локації, конкуренти (кругові діаграми), Market Leaderboard, тренди |
| All Locations | `all-locations.html` | Status changes, картки статусів, карта США з таймлайном, Internal Leaderboard |
| Metrics | `metrics.html` | таблиця Daily Metrics з перемикачем метрик |
| Onboarding | `onboarding.html` | створення тенанта (суперадмінка) + усі стани панелі |

## Запуск

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # збірка в dist/
npm run preview   # перегляд зібраного dist/
```

## Структура

```
*.html                 сторінки (верстка)
src/styles/main.css    Tailwind 4 + шрифти, палітра, базові стилі, .dc-icon
src/styles/icons.css   класи іконок .i-<name> (генерується)
src/icons/*.svg        іконки (монохромні, колір = currentColor)
src/js/info-tips.js    підказки «i», модалка «More», автопідказки на бейджах
src/js/trends.js       Single Location: чіпи змін, блок і модалка Trends
src/js/rank-switch.js  Single Location: перемикач варіантів показу місця на ринку
src/js/network.js      All Locations: Status changes, карта (d3), таймлайн, тренд локації
src/js/metrics.js      Metrics: рендер таблиці з JSON
src/js/chart.js        лінива підвантажка Chart.js
assets/img/            зображення
docs/                  контракти даних для бекенду
design/export/         сирий експорт із Claude Design (джерело для scripts/import-design.py)
```

### Іконки

```html
<i class="dc-icon i-search" style="width:18px;height:18px"></i>
```

Колір береться з `color` (класи `text-[#072C4A]` тощо). Нова іконка — SVG у `src/icons/` і рядок у `src/styles/icons.css`.

### Дані

- **All Locations** — JSON у `<script type="application/json" id="network-data">` або `SharkNetwork.setData(data)`.
  Формат: [docs/NETWORK-DATA.md](docs/NETWORK-DATA.md).
- **Metrics** — JSON у `<script type="application/json" id="metrics-data">`. Формат: [docs/METRICS-DATA.md](docs/METRICS-DATA.md).
- **Single Location** — значення в розмітці (картки й таблиця). Історію для трендів зараз генерує `trends.js`
  з поточних значень (демо); з бекендом туди треба віддати реальні денні ряди (див. коментар на початку файлу).

### Оновлення з дизайну

Якщо дизайн змінився: покласти свіжі файли з Claude Design у `design/export/<page>/<page>.html` і виконати
`npm run import-design` — сторінки в корені перегенеруються (Tailwind CDN прибирається, іконки виносяться в класи,
посилання й шляхи до картинок виправляються).

> Експорт Metrics обрізається лімітом розміру, тому таблицю Metrics рендерить `metrics.js` за логікою з
> `MetricsPage.jsx` дизайнера.

## Автодеплой (GitHub Actions)

`.github/workflows/deploy.yml`: на кожен push у `main` (або вручну: Actions → «Build & deploy» → Run workflow)
— `npm ci`, `npm run build`, далі:

1. **GitHub Pages** — увімкнути один раз: **Settings → Pages → Build and deployment → Source: «GitHub Actions»**.
   Сайт буде на `https://<owner>.github.io/shark/`.
2. **Свій сервер (необов'язково)** — rsync `dist/` по SSH. Працює, лише коли задано секрет `SSH_HOST`.
   **Settings → Secrets and variables → Actions**:
   - Secrets: `SSH_HOST`, `SSH_USER`, `SSH_KEY` (приватний ключ, публічна частина — у `~/.ssh/authorized_keys` на сервері),
     `DEPLOY_PATH` (абсолютний шлях до webroot, напр. `/var/www/shark`).
   - Variables: `SSH_PORT` (якщо не 22).
