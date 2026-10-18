// Nearest / All Competitors: doughnut chart by status (Chart.js), coloured like the legend rows next to it.
// Data is read from the legend rows (label, count, swatch colour), so the markup stays the single source.
// Hovering a segment or a legend row shows a navy tip (same style as the «i» tips) with the number of competitors.
import { loadChart } from './chart.js'

const canvases = document.querySelectorAll('canvas[data-donut]')

const tip = document.createElement('div')
tip.setAttribute('role', 'tooltip')
tip.style.cssText = 'position:fixed;z-index:60;display:none;pointer-events:none;min-width:160px;box-sizing:border-box;border-radius:12px;background:#072C4A;color:#FAFAFA;padding:12px 14px;box-shadow:0 8px 24px rgba(7,44,74,0.25);font-family:Inter,sans-serif'
document.body.appendChild(tip)

function showTip(x, y, row, total) {
  const pct = total ? Math.round((row.count / total) * 100) : 0
  tip.innerHTML = '<div style="display:flex;align-items:center;gap:8px;font-family:\'Plus Jakarta Sans\',sans-serif;font-size:14px;font-weight:700"><span style="width:10px;height:10px;border-radius:3px;background:' + row.color + ';box-shadow:0 0 0 1px rgba(250,250,250,0.6)"></span>' + row.label + '</div>' +
    '<p style="margin:4px 0 0;font-size:13px;line-height:1.45">' + row.count + (row.count === 1 ? ' competitor' : ' competitors') + ' · ' + pct + '%</p>' +
    (row.client ? '<p style="margin:2px 0 0;font-size:12px;color:#BDF0DC">Your business is here</p>' : '')
  tip.style.display = 'block'
  const left = Math.min(x + 14, window.innerWidth - tip.offsetWidth - 8)
  const top = y + 14 + tip.offsetHeight > window.innerHeight - 8 ? y - tip.offsetHeight - 14 : y + 14
  tip.style.left = left + 'px'
  tip.style.top = top + 'px'
}
function hideTip() { tip.style.display = 'none' }

function readRows(card) {
  return [...card.querySelectorAll('[data-swatch]')].map((sw) => {
    const row = sw.parentElement
    const head = row.querySelector('.justify-between')
    return {
      el: row,
      label: head.querySelector('span').textContent.trim(),
      count: +head.querySelector('.frub').textContent.trim() || 0,
      color: sw.style.background,
      client: /Your Business/.test(head.textContent),
    }
  })
}

if (canvases.length) {
  loadChart().then((Chart) => {
    canvases.forEach((canvas) => {
      const card = canvas.closest('article')
      const rows = readRows(card)
      const total = rows.reduce((a, r) => a + r.count, 0)
      const chart = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: rows.map((r) => r.label),
          datasets: [{
            data: rows.map((r) => r.count),
            backgroundColor: rows.map((r) => r.color),
            borderColor: '#FAFAFA',
            borderWidth: 2,
            hoverOffset: 8,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          layout: { padding: 10 },
          animation: { duration: 600 },
          plugins: {
            legend: { display: false },
            tooltip: {
              enabled: false,
              external: ({ chart: c, tooltip: t }) => {
                if (!t.opacity || !t.dataPoints || !t.dataPoints.length) return hideTip()
                const r = c.canvas.getBoundingClientRect()
                showTip(r.left + t.caretX, r.top + t.caretY, rows[t.dataPoints[0].dataIndex], total)
              },
            },
          },
        },
        plugins: [{
          // total in the middle of the ring
          id: 'centerTotal',
          afterDraw(c) {
            const { ctx, chartArea: a } = c
            const x = (a.left + a.right) / 2, y = (a.top + a.bottom) / 2
            ctx.save()
            ctx.textAlign = 'center'
            ctx.fillStyle = '#072C4A'
            ctx.font = '600 40px Rubik, sans-serif'
            ctx.textBaseline = 'alphabetic'
            ctx.fillText(String(total), x, y + 8)
            ctx.font = '500 12px Inter, sans-serif'
            ctx.fillStyle = '#506A7F'
            ctx.textBaseline = 'top'
            ctx.fillText('competitors', x, y + 16)
            ctx.restore()
          },
        }],
      })
      canvas.addEventListener('mouseleave', hideTip)

      // legend rows highlight the matching segment and show the same tip
      rows.forEach((row, i) => {
        row.el.style.cursor = 'default'
        row.el.addEventListener('mouseenter', () => {
          if (!row.count) return
          chart.setActiveElements([{ datasetIndex: 0, index: i }])
          chart.update('none')
          const r = row.el.getBoundingClientRect()
          showTip(r.right, r.top, row, total)
        })
        row.el.addEventListener('mouseleave', () => { chart.setActiveElements([]); chart.update('none'); hideTip() })
      })
    })
  })
}
