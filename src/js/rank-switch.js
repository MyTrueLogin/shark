// Single Location: switch between market-position variants ([data-rv] buttons in #rank-var-switch,
// blocks marked [data-rank-var]). The choice is remembered in localStorage.
const sw = document.getElementById('rank-var-switch')

if (sw) {
  const ON = 'font-semibold bg-white text-[#072C4A] shadow-[0_1px_2px_rgba(7,44,74,0.12)]'.split(' ')
  const OFF = 'font-medium bg-transparent text-[#506A7F]'.split(' ')

  const set = (v) => {
    document.querySelectorAll('[data-rank-var]').forEach((e) => {
      e.style.display = e.dataset.rankVar === v ? '' : 'none'
    })
    sw.querySelectorAll('[data-rv]').forEach((b) => {
      const on = b.dataset.rv === v
      b.classList.remove(...(on ? OFF : ON))
      b.classList.add(...(on ? ON : OFF))
    })
    try { localStorage.setItem('shark-rank-var', v) } catch (e) { /* storage unavailable */ }
  }

  sw.querySelectorAll('[data-rv]').forEach((b) => { b.onclick = () => set(b.dataset.rv) })

  let saved = null
  try { saved = localStorage.getItem('shark-rank-var') } catch (e) { /* storage unavailable */ }
  if (saved) set(saved)
}
