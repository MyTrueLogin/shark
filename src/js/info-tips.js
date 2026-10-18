// Info tooltips («i» buttons with data-info="<key>»), the «More» modal, and short hover hints
// attached automatically to badges whose text matches HINTS / HINT_RX.
// Public API: window.SharkHint(el, title, text) — attach a hint to any element.

const INFO = {
  performance: {
    title: 'Performance',
    short: 'How visible this location is in Google Maps for your keywords, compared with competitors within 20 miles.',
    modalTitle: 'How Performance is calculated',
    intro: 'Performance shows how often this location appears in Google Maps results for your tracked keywords, and how high it ranks there, relative to every competitor in the local market.',
    img1: 'Image: search grid around the location',
    sections: [
      ['What the levels mean', ['<b>Dominant / Very Strong</b> — shows in the top results across most of the area.', '<b>Strong / Mediocre</b> — visible in parts of the area, often below competitors.', '<b>Weak / Sleeping</b> — rarely or never shows for your keywords.']],
      ['How to improve it', 'Keep the Google Business Profile complete, add photos and posts regularly, and grow the number of reviews.'],
    ],
    img2: 'Image: example of each level',
  },
  reputation: {
    title: 'Reputation',
    short: 'Combines rating, review volume and review freshness into one score compared with local competitors.',
    modalTitle: 'How Reputation is calculated',
    intro: 'Reputation reflects how customers see this location on Google: the average rating, how many reviews it has, and how recently new reviews arrived, compared with the local market.',
    img1: 'Image: reputation score breakdown',
    sections: [
      ['What affects it', ['<b>Rating</b> — the average star rating.', '<b>Volume</b> — total reviews compared with competitors.', '<b>Freshness</b> — how many reviews arrived in the last 90 days.']],
      ['How to improve it', 'Ask every satisfied customer for a review and reply to all reviews, including negative ones.'],
    ],
  },
  rating: {
    title: 'Rating',
    short: 'The average Google star rating of this location across all reviews.',
    modalTitle: 'About Rating',
    intro: 'Rating is the average number of stars customers gave this location on Google. With few reviews, a single new review can move it significantly.',
    img1: 'Image: rating on the Google Business Profile',
    sections: [
      ['Badges', ['<b>Perfect</b> — 4.8 and above.', '<b>Good</b> — 4.3 to 4.7.', '<b>Needs attention</b> — below 4.3.']],
      ['Keep in mind', 'A high rating with a small number of reviews is less convincing for customers than a slightly lower rating with many reviews.'],
    ],
  },
  reviews: {
    title: 'Total Reviews',
    short: 'The number of Google reviews this location has, and its rank by review count in the local market.',
    modalTitle: 'About Total Reviews',
    intro: 'Total Reviews counts every Google review left for this location. The rank badge shows where it sits by review count among local competitors.',
    img1: 'Image: review count compared with competitors',
    sections: [
      ['Why it matters', 'Review count is one of the signals Google uses to rank businesses in Maps, and customers trust profiles with more reviews.'],
      ['How to grow it', 'Send a review link after each order and add a QR code to invoices and delivery notes.'],
    ],
  },
  strong: {
    title: 'Strong Presence',
    short: 'Locations that show in the top Google Maps results across most of their area.',
    modalTitle: 'Strong Presence',
    intro: 'A location has strong presence when its Performance score places it among the leaders of its local market for your tracked keywords.',
    img1: 'Image: example of a strong location on the map',
    sections: [['What to do', 'Keep the profile active with posts, photos and new reviews to hold the position.']],
  },
  average: {
    title: 'Average Presence',
    short: 'Locations visible in parts of their area, usually ranked below the leading competitors.',
    modalTitle: 'Average Presence',
    intro: 'A location has average presence when it appears for your keywords in some of the area but loses the top positions to competitors.',
    img1: 'Image: example of an average location on the map',
    sections: [['What to do', 'Focus on review growth and profile completeness to move into the top results.']],
  },
  weak: {
    title: 'Weak Presence',
    short: 'Locations that rarely show in Google Maps results for your keywords.',
    modalTitle: 'Weak Presence',
    intro: 'A location has weak presence when it appears only occasionally and at low positions for your tracked keywords.',
    img1: 'Image: example of a weak location on the map',
    sections: [['What to do', 'Check the business category, keywords in the description and the number of reviews compared with competitors.']],
  },
  sleeping: {
    title: 'Sleeping Presence',
    short: 'Locations that do not show for your keywords at all, or have no data yet.',
    modalTitle: 'Sleeping Presence',
    intro: 'A location is sleeping when it does not appear in Google Maps results for any tracked keyword, or when tracking has not collected data for it yet.',
    img1: 'Image: example of a sleeping location on the map',
    sections: [['What to do', 'Verify the Google Business Profile is active and correctly categorised, then start collecting reviews.']],
  },
}

const HINTS = {
  'Dominant': 'Shows in the top results across almost the whole area for every keyword.',
  'Very Strong': 'Shows in the top results in most of the area.',
  'Strong': 'Visible in most of the area, often among the top results.',
  'Mediocre': 'Visible in parts of the area, usually below the leaders. Counted as Average on All Locations.',
  'Average': 'Visible in parts of the area, usually below the leading competitors.',
  'Weak': 'Rarely shows in Google Maps results for your keywords.',
  'Sleeping': 'Does not show for your keywords, or tracking has no data yet.',
  'Perfect': 'Average rating of 4.8 stars or higher.',
  'Your Business': 'The category your location is in right now.',
  'No reviews': 'No Google reviews yet, so Rating and Reputation for this location are not reliable.',
  'Status': 'Presence level based on Performance: Strong, Average, Weak or Sleeping.',
  'Last Review': 'Date of the most recent Google review. No new reviews for 90 days lowers Reputation.',
}
const HINT_RX = [
  [/^#\d+ of \d+ in (the )?local market$/, 'Market position', 'Place by Performance among all businesses tracked within 20 miles.'],
  [/^\d+(st|nd|rd|th)$/, 'Review rank', 'Place by number of reviews among local competitors.'],
  [/^\d+(\.\d+)? mi$/, 'Distance', 'Distance from this competitor to your location.'],
]

const ICON = 'url("data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>') + '")'

const tip = document.createElement('div')
tip.setAttribute('role', 'tooltip')
tip.style.cssText = 'position:fixed;z-index:60;display:none;width:280px;box-sizing:border-box;border-radius:12px;background:#072C4A;color:#FAFAFA;padding:16px;box-shadow:0 8px 24px rgba(7,44,74,0.25);font-family:Inter,sans-serif'
tip.innerHTML = '<div data-t style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:14px;font-weight:700;margin-bottom:4px"></div><p data-s style="margin:0;font-size:13px;line-height:1.45"></p><button type="button" data-more style="margin-top:12px;border:0;cursor:pointer;border-radius:6px;background:#B9E3FE;color:#072C4A;padding:6px 12px;font-family:\'Plus Jakarta Sans\',sans-serif;font-size:12px;font-weight:600">More</button>'
const arrow = document.createElement('span')
arrow.style.cssText = 'position:absolute;width:12px;height:12px;background:#072C4A;transform:rotate(45deg);border-radius:2px;pointer-events:none'
tip.appendChild(arrow)
document.body.appendChild(tip)

const modal = document.createElement('div')
modal.style.cssText = 'position:fixed;inset:0;z-index:70;display:none;align-items:center;justify-content:center;background:rgba(7,44,74,0.4);padding:16px'
modal.innerHTML = '<div role="dialog" aria-modal="true" style="position:relative;box-sizing:border-box;width:100%;max-width:720px;max-height:90vh;display:flex;overflow:hidden;border-radius:16px;background:#FAFAFA;box-shadow:0 16px 48px rgba(7,44,74,0.25);font-family:Inter,sans-serif;color:#072C4A"><button type="button" data-close aria-label="Close" style="position:absolute;z-index:1;right:20px;top:16px;width:36px;height:36px;border:0;border-radius:999px;background:#F0F8FF;color:#072C4A;font-size:20px;line-height:1;cursor:pointer">×</button><div style="flex:1;min-height:0;overflow-y:auto;padding:32px;scrollbar-width:thin;scrollbar-color:#BDC6CE transparent"><div data-body></div></div></div>'
document.body.appendChild(modal)

const ph = (t, h) => '<div style="display:flex;align-items:center;justify-content:center;height:' + h + 'px;margin-bottom:24px;border:1px dashed rgba(0,94,157,0.3);border-radius:12px;background:#F0F8FF;font-size:13px;color:#005E9D">' + t + '</div>'
const H = 'font-family:\'Plus Jakarta Sans\',sans-serif;'

let current = null
let hideT = null

function place(btn) {
  const r = btn.getBoundingClientRect()
  const left = Math.max(16, Math.min(r.left + r.width / 2 - 28, window.innerWidth - 296))
  tip.style.left = left + 'px'
  const below = r.bottom + 6
  const th = tip.offsetHeight
  const up = below + th > window.innerHeight - 8
  tip.style.top = (up ? Math.max(8, r.top - th - 6) : below) + 'px'
  arrow.style.left = Math.max(10, Math.min(r.left + r.width / 2 - left - 6, 258)) + 'px'
  arrow.style.top = up ? '' : '-5px'
  arrow.style.bottom = up ? '-5px' : ''
}
function showHint(el) {
  clearTimeout(hideT)
  current = el
  tip.querySelector('[data-t]').textContent = el.dataset.hintTitle
  tip.querySelector('[data-s]').textContent = el.dataset.hint
  tip.querySelector('[data-more]').style.display = 'none'
  tip.style.display = 'block'
  place(el)
}
function attachHint(el, title, text) {
  if (el.dataset.hint) return
  el.dataset.hint = text
  el.dataset.hintTitle = title
  el.style.cursor = 'help'
  el.addEventListener('mouseenter', () => showHint(el))
  el.addEventListener('mouseleave', hideSoon)
}
window.SharkHint = attachHint

function show(btn) {
  clearTimeout(hideT)
  const d = INFO[btn.dataset.info]
  if (!d) return
  tip.querySelector('[data-more]').style.display = ''
  current = btn
  tip.querySelector('[data-t]').textContent = d.title
  tip.querySelector('[data-s]').textContent = d.short
  tip.style.display = 'block'
  place(btn)
}
function hideSoon() { clearTimeout(hideT); hideT = setTimeout(hide, 150) }
function hide() { tip.style.display = 'none'; current = null }

function openModal(key) {
  const d = INFO[key]
  if (!d) return
  let html = '<h2 style="' + H + 'margin:0 0 8px;font-size:28px;font-weight:700;letter-spacing:-0.014em;padding-right:40px">' + d.modalTitle + '</h2><p style="margin:0 0 24px;max-width:560px;font-size:15px;line-height:1.55">' + d.intro + '</p>' + ph(d.img1, 240)
  d.sections.forEach((s, i) => {
    html += '<h3 style="' + H + 'margin:0 0 8px;font-size:18px;font-weight:700">' + s[0] + '</h3>'
    html += Array.isArray(s[1])
      ? '<ul style="margin:0 0 24px;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px;font-size:14px">' + s[1].map((x) => '<li>' + x + '</li>').join('') + '</ul>'
      : '<p style="margin:0 0 24px;font-size:14px;line-height:1.55">' + s[1] + '</p>'
    if (i === 0 && d.img2) html += ph(d.img2, 180)
  })
  modal.querySelector('[data-body]').innerHTML = html
  modal.style.display = 'flex'
}
function closeModal() { modal.style.display = 'none' }

document.querySelectorAll('[data-info]').forEach((btn) => {
  if (!btn.querySelector('i')) {
    const s = btn.dataset.size || 16
    const i = document.createElement('i')
    i.style.cssText = 'display:block;width:' + s + 'px;height:' + s + 'px;background-color:currentColor'
    ;['webkitMask', 'mask'].forEach((p) => {
      i.style[p + 'Image'] = ICON
      i.style[p + 'Size'] = 'contain'
      i.style[p + 'Repeat'] = 'no-repeat'
      i.style[p + 'Position'] = 'center'
    })
    btn.appendChild(i)
  }
  btn.addEventListener('mouseenter', () => show(btn))
  btn.addEventListener('mouseleave', hideSoon)
  btn.addEventListener('focus', () => show(btn))
  btn.addEventListener('blur', hideSoon)
  btn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    current === btn && tip.style.display === 'block' ? hide() : show(btn)
  })
})

// auto-hints: leaf elements whose text is a known badge label
document.querySelectorAll('span, th, div').forEach((el) => {
  if ([].some.call(el.children, (c) => c.tagName !== 'I' && c.tagName !== 'svg')) return
  if (el.closest('[data-info], h1, h2, h3, nav, header, [data-trend]') || /text-\[(24|80)px\]/.test(el.className)) return
  const t = el.textContent.trim()
  if (!t || t.length > 40) return
  const target = el.parentElement && /rounded-full/.test(el.parentElement.className) && el.parentElement.children.length <= 2 ? el.parentElement : el
  if (HINTS[t]) return attachHint(target, t, HINTS[t])
  for (const [rx, title, text] of HINT_RX) if (rx.test(t)) return attachHint(target, title, text)
})

// pinned tip: [data-info][data-tip-pinned] shows its tip right away, without hover (promo example),
// with a pulsing ring on the «i» so it is clear the button is clickable; «More» opens the modal
document.querySelectorAll('[data-info][data-tip-pinned]').forEach((btn) => {
  const d = INFO[btn.dataset.info]
  if (!d) return
  const pin = tip.cloneNode(true)
  pin.removeAttribute('id')
  pin.style.position = 'absolute'
  pin.style.zIndex = '40'
  pin.style.display = 'block'
  pin.querySelector('[data-t]').textContent = d.title
  pin.querySelector('[data-s]').textContent = d.short
  const pinArrow = pin.lastElementChild
  pin.querySelector('[data-more]').addEventListener('click', (e) => { e.stopPropagation(); openModal(btn.dataset.info) })
  document.body.appendChild(pin)
  btn.style.borderRadius = '999px'
  btn.animate([{ boxShadow: '0 0 0 0 rgba(0,94,157,0.45)' }, { boxShadow: '0 0 0 8px rgba(0,94,157,0)' }], { duration: 1600, iterations: Infinity })
  // the pinned tip replaces the hover one for this button; a click still opens the modal
  btn.addEventListener('mouseenter', () => setTimeout(hide), true)
  btn.addEventListener('click', (e) => { e.stopImmediatePropagation(); e.preventDefault(); openModal(btn.dataset.info) }, true)
  const placePin = () => {
    const r = btn.getBoundingClientRect()
    const left = Math.max(16, Math.min(r.left + r.width / 2 - 28, document.documentElement.clientWidth - 296))
    pin.style.left = left + window.scrollX + 'px'
    pin.style.top = r.bottom + 6 + window.scrollY + 'px'
    pinArrow.style.left = Math.max(10, Math.min(r.left + r.width / 2 - left - 6, 258)) + 'px'
    pinArrow.style.top = '-5px'
  }
  placePin()
  window.addEventListener('resize', placePin)
  window.addEventListener('load', placePin)
})

tip.addEventListener('mouseenter', () => clearTimeout(hideT))
tip.addEventListener('mouseleave', hideSoon)
tip.addEventListener('click', (e) => e.stopPropagation())
tip.querySelector('[data-more]').addEventListener('click', () => {
  const k = current && current.dataset.info
  hide()
  openModal(k)
})
modal.querySelector('[data-close]').addEventListener('click', closeModal)
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal() })
document.addEventListener('click', hide)
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { hide(); closeModal() } })
window.addEventListener('scroll', () => { if (current) place(current) }, true)
window.addEventListener('resize', hide)
