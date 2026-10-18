// Chart.js is loaded lazily — only when a trend chart is opened.
let pending = null

export function loadChart() {
  if (!pending) pending = import('chart.js/auto').then((m) => m.default)
  return pending
}
