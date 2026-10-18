// Metrics: «Daily Metrics» table — one row per profile, one column per day, coloured by day-to-day change.
// Data: <script type="application/json" id="metrics-data"> { period, snapshots, profiles[] } (see docs/METRICS-DATA.md).
// Metric switcher: buttons with [data-metric].

const METRIC_LABELS = {
  reviews: 'Reviews',
  rating: 'Rating',
  services: 'Services',
  service_details: 'Service details',
  service_media: 'Products',
  service_categories: 'Service categories',
  attributes: 'Attributes',
  profile_score: 'Profile score',
  posts: 'Posts/Updates',
  last_review_age: 'Last review age',
}

const SMALL_STEP_METRICS = ['services', 'service_details', 'service_media', 'service_categories', 'attributes', 'profile_score', 'posts']

const FILLED = 'min-w-[42px] px-[7px]'
const GREEN_DELTA = 'text-[#047857]'
const RED_DELTA = 'text-[#C4320A]'

const TONES = {
  empty: { pill: 'min-w-0 px-0 bg-transparent text-transparent', delta: 'text-[#506A7F]' },
  first: { pill: `${FILLED} text-[#072C4A]`, delta: 'text-[#506A7F]' },
  flat: { pill: `${FILLED} bg-[#F2F4F7] text-[#506A7F]`, delta: 'text-[#506A7F]' },
  'green-1': { pill: `${FILLED} bg-[#DCFAE6] text-[#072C4A]`, delta: GREEN_DELTA },
  'green-2': { pill: `${FILLED} bg-[#ABEFC6] text-[#072C4A]`, delta: GREEN_DELTA },
  'green-3': { pill: `${FILLED} bg-[#75E0A7] text-[#072C4A]`, delta: GREEN_DELTA },
  'green-4': { pill: `${FILLED} bg-[#47CD89] text-[#072C4A]`, delta: GREEN_DELTA },
  'red-1': { pill: `${FILLED} bg-[#FEE4E2] text-[#072C4A]`, delta: RED_DELTA },
  'red-2': { pill: `${FILLED} bg-[#FECDCA] text-[#072C4A]`, delta: RED_DELTA },
  'red-3': { pill: `${FILLED} bg-[#FDA29B] text-[#072C4A]`, delta: RED_DELTA },
  'red-4': { pill: `${FILLED} bg-[#F97066] text-[#072C4A]`, delta: RED_DELTA },
}

const CELL = 'whitespace-nowrap border-y-[1.2px] border-t-transparent border-b-[#BDC6CE]/45 px-[10px] py-[9px] text-center transition-[border-color] duration-150'
const HEAD = `${CELL} fjk sticky top-0 h-[44px] text-[13px] font-normal text-[#2B4B64]`
const RANK = 'sticky left-0 w-[52px] min-w-[52px]'
const NAME = 'sticky left-[52px] w-[280px] min-w-[280px] max-w-[280px] overflow-hidden text-ellipsis text-left shadow-[1px_0_0_rgba(189,198,206,0.65)]'
const TOTAL = 'sticky right-0 min-w-[80px] shadow-[-1px_0_0_rgba(189,198,206,0.65)]'
const WEEKEND = 'bg-[#506A7F]/[0.035]'
const CURRENT = 'shadow-[inset_0_0_0_1.5px_rgba(0,94,157,0.7)]'
const ROW_HOVER = '[&>td]:h-[58px] [&:hover>td]:border-y-[#005E9D] [&:hover>td:first-child]:rounded-l-lg [&:hover>td:first-child]:border-l-[1.2px] [&:hover>td:first-child]:border-l-[#005E9D] [&:hover>td:last-child]:rounded-r-lg [&:hover>td:last-child]:border-r-[1.2px] [&:hover>td:last-child]:border-r-[#005E9D]'

const SWITCH_ON = 'bg-[#005E9D] text-white'.split(' ')
const SWITCH_OFF = 'bg-[#FAFAFA] text-[#506A7F] hover:text-[#072C4A]'.split(' ')

const MONTH = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' })
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

function calendarDays(period) {
  const days = []
  for (let date = new Date(`${period.first}T00:00:00Z`); date <= new Date(`${period.last}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + 1)) {
    const iso = date.toISOString().slice(0, 10)
    days.push({
      date: iso,
      label: date.getUTCDate() === 1 || days.length === 0 ? `${MONTH.format(date)} ${date.getUTCDate()}` : String(date.getUTCDate()),
      weekend: [0, 6].includes(date.getUTCDay()),
      current: iso === period.last,
    })
  }
  return days
}

function metricValue(metric, value) {
  if (value == null) return ''
  if (metric === 'rating') return value.toFixed(1)
  if (metric === 'last_review_age') return `${Math.round(value)}d`
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function metricDelta(metric, delta) {
  if (delta == null || delta === 0) return ''
  const value = metric === 'rating' ? delta.toFixed(1) : delta.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return `${delta > 0 ? '↑ +' : '↓ '}${value}`
}

function cellTone(metric, value, delta) {
  if (value == null) return 'empty'
  if (delta == null) return 'first'
  if (delta === 0) return 'flat'
  const magnitude = Math.abs(delta)
  let level
  if (metric === 'rating') level = magnitude < 0.2 ? 1 : magnitude < 0.5 ? 2 : 3
  else if (SMALL_STEP_METRICS.includes(metric)) level = magnitude <= 1 ? 1 : magnitude <= 3 ? 2 : 3
  else if (metric === 'last_review_age') level = magnitude <= 7 ? 1 : magnitude <= 30 ? 2 : 3
  else level = magnitude <= 1 ? 1 : magnitude <= 5 ? 2 : magnitude <= 20 ? 3 : 4
  const improved = metric === 'last_review_age' ? delta < 0 : delta > 0
  return `${improved ? 'green' : 'red'}-${level}`
}

// Value of a profile for a given day. A backend can pass per-day values as
// profile.daily[metric] = { "2026-09-11": 11, … }; otherwise the current value is shown for every snapshot day.
function dayValue(profile, metric, day, snapshots) {
  const daily = profile.daily && profile.daily[metric]
  if (daily) return daily[day.date] ?? null
  return day.date >= snapshots.first && day.date <= snapshots.last ? profile[metric] : null
}

function profileCells(profile, metric, days, snapshots) {
  let previous = null
  return days.map((day) => {
    const value = dayValue(profile, metric, day, snapshots)
    const delta = value == null || previous == null ? null : value - previous
    if (value != null) previous = value
    return { day, value: metricValue(metric, value), delta: metricDelta(metric, delta), tone: TONES[cellTone(metric, value, delta)] }
  })
}

function renderTable(table, data, metric) {
  const days = calendarDays(data.period)
  let html = '<thead><tr>'
  html += `<th class="${HEAD} ${RANK} z-6 bg-white">#</th>`
  html += `<th class="${HEAD} ${NAME} z-6 bg-white">Business / Competitor</th>`
  days.forEach((day) => {
    html += `<th title="${day.date}" class="${HEAD} z-4 w-[54px] min-w-[54px] ${day.weekend ? WEEKEND : 'bg-white'} ${day.current ? CURRENT : ''}">${day.label}</th>`
  })
  html += `<th class="${HEAD} ${TOTAL} z-5 bg-white">Total</th></tr></thead><tbody>`

  data.profiles.forEach((profile, index) => {
    const surface = profile.is_client ? 'bg-[#F0F8FF]' : 'bg-white'
    const name = profile.is_client ? `${profile.name} · Your business` : profile.name
    html += `<tr class="${ROW_HOVER}">`
    html += `<td class="${CELL} ${RANK} frub z-3 text-[20px] text-[#072C4A] ${surface}">${profile.is_client ? '' : index}</td>`
    html += `<td class="${CELL} ${NAME} fjk z-3 text-[15px] text-[#072C4A] ${surface}"><a href="${esc(profile.url || '#')}" class="text-inherit no-underline">${esc(name)}</a></td>`
    profileCells(profile, metric, days, data.snapshots).forEach((cell) => {
      html += `<td class="${CELL} ${cell.day.weekend ? WEEKEND : ''} ${cell.day.current ? CURRENT : ''}">`
      html += `<span class="frub inline-flex min-h-[28px] items-center justify-center rounded-[7px] py-1 text-[14px] font-medium ${cell.tone.pill}">${cell.value}</span>`
      html += `<span class="mt-[3px] block text-[9px] font-semibold leading-none tabular-nums ${cell.tone.delta}">${cell.delta}</span></td>`
    })
    html += `<td class="${CELL} ${TOTAL} frub z-3 text-[16px] font-medium text-[#072C4A] ${surface}">${metricValue(metric, profile[metric])}</td></tr>`
  })
  table.innerHTML = html + '</tbody>'
}

const table = document.getElementById('daily-metrics')
const source = document.getElementById('metrics-data')

if (table && source) {
  const data = JSON.parse(source.textContent)
  const subtitle = document.getElementById('metrics-subtitle')
  if (subtitle) subtitle.textContent = `${data.profiles.length} profiles · ${data.period.first} → ${data.period.last}`

  const select = (metric) => {
    document.querySelectorAll('[data-metric]').forEach((b) => {
      const on = b.dataset.metric === metric
      b.classList.remove(...(on ? SWITCH_OFF : SWITCH_ON))
      b.classList.add(...(on ? SWITCH_ON : SWITCH_OFF))
      b.setAttribute('aria-pressed', String(on))
    })
    renderTable(table, data, metric)
  }

  document.querySelectorAll('[data-metric]').forEach((b) => { b.onclick = () => select(b.dataset.metric) })
  select('reviews')
}

export { METRIC_LABELS }
