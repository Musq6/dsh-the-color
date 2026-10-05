/**
 * dsh-the-color browser half, pre-built in the repository's dynamic client
 * bundle format (the closure-factory artifact emitted by the clientBundle
 * tsdown preset): it only registers a factory at script execution; the
 * factory materializes the plugin module, and `apply` stacks one token
 * override layer through the official `ctx.theme.overrideTokens` channel
 * (ui-layout's presenter writes it as inline CSS variables on body, retracting
 * its own previous set) plus a dedicated Settings section of its own.
 *
 * The override covers ui-theme palette entries instead of aliases so every
 * consumer follows at once: deepseek-* powers the send button, deep-diving
 * running status, links, active workspace folder, user bubble and business
 * state accents; blue-950 / blue-300 are the deep-diving mix partners and
 * blue-450 is the ContextMeter message tint; the brand-primary-new alias is
 * hardcoded in the light palette and is overridden explicitly. Values are
 * theme-invariant, so both scheme slots carry the same string except the
 * alias, whose dark scheme keeps the weaker 450 shade.
 *
 * Default (no stored accent) stacks no layer at all and emits nothing: the
 * stock palette stays byte-identical. The Settings section offers preset
 * swatches plus a native color-well picker; localStorage['dsh-the-color:accent']
 * (a hex color) remains the persistence and lets the DevTools console drive
 * custom colors.
 */
window.__ModuleLoader__.load({ id: "dsh-the-color", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;

const React = require('react')

const STORAGE_KEY = 'dsh-the-color:accent'
const LAYER_SOURCE = 'dsh-the-color'
const LOCALE_NS = 'settings.theme-color'
const BRAND_ALIAS = '--dsw-alias-brand-primary-new-colorprimary-new-color'
/** Color the native picker opens with when no custom accent is stored. */
const DEFAULT_PICKER_COLOR = '#4176e6'

/** Preset swatches; `color: null` restores the stock palette (zero-diff default). */
const PRESETS = [
  { id: 'default', color: null, swatch: '#4176e6', labelKey: 'themeColor.preset.default' },
  { id: 'violet', color: '#8b5cf6', swatch: '#8b5cf6', labelKey: 'themeColor.preset.violet' },
  { id: 'teal', color: '#14b8a6', swatch: '#14b8a6', labelKey: 'themeColor.preset.teal' },
  { id: 'green', color: '#22c55e', swatch: '#22c55e', labelKey: 'themeColor.preset.green' },
  { id: 'amber', color: '#f59e0b', swatch: '#f59e0b', labelKey: 'themeColor.preset.amber' },
  { id: 'rose', color: '#ec4899', swatch: '#ec4899', labelKey: 'themeColor.preset.rose' },
]

/** Settings-section dictionaries (registered through ctx.locale under LOCALE_NS). */
const LOCALES = {
  zh: {
    'themeColor.nav': '主题色',
    'themeColor.presets.title': '预设色',
    'themeColor.presets.description': '点击色块立即应用，统一发送按钮、运行状态、激活文件夹、链接与气泡等蓝色表面',
    'themeColor.custom.title': '自选颜色',
    'themeColor.custom.description': '从色板中选取任意颜色，立即生效',
    'themeColor.preset.default': '默认',
    'themeColor.preset.violet': '紫罗兰',
    'themeColor.preset.teal': '青绿',
    'themeColor.preset.green': '绿色',
    'themeColor.preset.amber': '琥珀',
    'themeColor.preset.rose': '玫红',
    'themeColor.preset.custom': '自定义',
  },
  en: {
    'themeColor.nav': 'Theme color',
    'themeColor.presets.title': 'Presets',
    'themeColor.presets.description': 'Click to apply instantly — unifies the send button, running status, active folders, links, and bubbles',
    'themeColor.custom.title': 'Custom color',
    'themeColor.custom.description': 'Pick any color from the well; it applies immediately',
    'themeColor.preset.default': 'Default',
    'themeColor.preset.violet': 'Violet',
    'themeColor.preset.teal': 'Teal',
    'themeColor.preset.green': 'Green',
    'themeColor.preset.amber': 'Amber',
    'themeColor.preset.rose': 'Rose',
    'themeColor.preset.custom': 'Custom',
  },
}

/**
 * Calibrated HSL ladder: [variable, target lightness %, saturation factor].
 * Factors reproduce the stock palette when the accent is the stock 500
 * (hsl(221, 77%, 58%)); deepseek-500 itself stays the accent untouched.
 */
const LADDER = [
  ['--dsw-static-deepseek-50', 96, 1.15],
  ['--dsw-static-deepseek-100', 94, 1.1],
  ['--dsw-static-deepseek-200', 91, 1.3],
  ['--dsw-static-deepseek-300', 86, 1.25],
  ['--dsw-static-deepseek-400', 74, 1.3],
  ['--dsw-static-deepseek-450', 67, 1.28],
  ['--dsw-static-deepseek-800', 28, 0.35],
  ['--dsw-static-deepseek-900', 21, 0.25],
  ['--dsw-static-blue-950', 21, 0.74],
  ['--dsw-static-blue-300', 78, 1.25],
  ['--dsw-static-blue-450', 64, 1.18],
]

/** Parse #rgb / #rrggbb into [r, g, b]; null when the input is not a hex color. */
function parseHex(input) {
  if (typeof input !== 'string') return null
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/iu.exec(input.trim())
  if (match === null) return null
  const hex = match[1].length === 3 ? match[1].replace(/./gu, ch => ch + ch) : match[1]
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]
}

function toHex(rgb) {
  return '#' + rgb.map(value => value.toString(16).padStart(2, '0')).join('')
}

function rgbToHsl(rgb) {
  const r = rgb[0] / 255; const g = rgb[1] / 255; const b = rgb[2] / 255
  const max = Math.max(r, g, b); const min = Math.min(r, g, b); const d = max - min
  const l = (max + min) / 2
  if (d === 0) return [0, 0, l * 100]
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s * 100, l * 100]
}

function hslToRgb(h, s, l) {
  const hue = ((h % 360) + 360) % 360
  const sat = Math.min(100, Math.max(0, s)) / 100
  const light = Math.min(100, Math.max(0, l)) / 100
  const c = (1 - Math.abs(2 * light - 1)) * sat
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = light - c / 2
  const base = hue < 60 ? [c, x, 0]
    : hue < 120 ? [x, c, 0]
      : hue < 180 ? [0, c, x]
        : hue < 240 ? [0, x, c]
          : hue < 300 ? [x, 0, c]
            : [c, 0, x]
  return base.map(value => Math.round((value + m) * 255))
}

const fmt = rgb => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`

/** Derive the whole family from one accent; deepseek-500 is the accent verbatim. */
function derive(accent) {
  const [h, s] = rgbToHsl(accent)
  const values = { '--dsw-static-deepseek-500': fmt(accent) }
  for (const [name, lightness, factor] of LADDER) values[name] = fmt(hslToRgb(h, s * factor, lightness))
  return values
}

/** Build the override layer: family + partners carry one value per both schemes; the alias pairs light/dark. */
function tokensOf(accent) {
  const values = derive(accent)
  const tokens = {}
  for (const [name, value] of Object.entries(values)) tokens[name] = { light: value, dark: value }
  tokens[BRAND_ALIAS] = { light: fmt(accent), dark: values['--dsw-static-deepseek-450'] }
  return tokens
}

/** Read the stored accent as canonical #rrggbb; absent, empty, or unparsable values fall back to the stock palette. */
function storedAccent() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === null || stored === '') return null
    const rgb = parseHex(stored)
    if (rgb === null) console.warn(`dsh-the-color: ignoring unparsable accent ${JSON.stringify(stored)}`)
    return rgb === null ? null : toHex(rgb)
  } catch {
    // Storage can be unavailable (sandboxed frame): run with the stock palette.
    return null
  }
}

/** Section styles, scoped by the page's data attribute; matches the native settings-row rhythm. */
const PAGE_CSS = [
  "[data-dsh-theme-color-page] .row{display:flex;align-items:center;gap:8px;padding:16px 0;border-bottom:0.5px solid var(--dsw-alias-border-l2)}",
  '[data-dsh-theme-color-page] .row:last-child{border-bottom:none}',
  '[data-dsh-theme-color-page] .rowText{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}',
  '[data-dsh-theme-color-page] .title{font-size:14px;font-weight:400;line-height:22px;color:var(--dsw-alias-label-primary)}',
  '[data-dsh-theme-color-page] .desc{font-size:12px;font-weight:400;line-height:18px;color:var(--dsw-alias-label-tertiary)}',
  '[data-dsh-theme-color-page] .swatches{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap}',
  '[data-dsh-theme-color-page] .swatch{appearance:none;box-sizing:border-box;width:26px;height:26px;padding:0;border-radius:999px;border:0.5px solid var(--dsw-alias-border-l4);cursor:pointer;display:grid;place-items:center;transition:box-shadow 100ms ease}',
  '[data-dsh-theme-color-page] .swatch:hover{box-shadow:0 0 0 2px var(--dsw-alias-interactive-bg-hover)}',
  "[data-dsh-theme-color-page] .swatch[aria-pressed='true']{box-shadow:0 0 0 2px var(--dsw-alias-bg-base),0 0 0 4px var(--dsw-static-neutral-bluish-400)}",
  '[data-dsh-theme-color-page] .picker{appearance:none;box-sizing:border-box;width:26px;height:26px;padding:0;border:0.5px solid var(--dsw-alias-border-l4);border-radius:999px;background:transparent;cursor:pointer}',
  '[data-dsh-theme-color-page] .picker::-webkit-color-swatch-wrapper{padding:0}',
  '[data-dsh-theme-color-page] .picker::-webkit-color-swatch{border:none;border-radius:999px}',
].join('\n')

const CHECK_GLYPH = React.createElement('svg', { viewBox: '0 0 16 16', width: 14, height: 14, 'aria-hidden': true, fill: 'none' },
  React.createElement('path', { d: 'M3.5 8.5 6.5 11.5 12.5 5.5', stroke: '#fff', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }))

/**
 * The Theme-color settings page: preset swatches (plus the current custom color)
 * and a native color-well picker. Selection follows the stored accent; every
 * write goes through the injected setter.
 */
function ThemeColorSection({ t, setAccent }) {
  const [, rerender] = React.useState(0)
  const current = storedAccent()
  const isCustom = current !== null && !PRESETS.some(preset => preset.color === current)
  const choose = value => {
    setAccent(value)
    rerender(count => count + 1)
  }
  const swatch = ({ key, background, value, label, selected }) => React.createElement('button', {
    key,
    type: 'button',
    className: 'swatch',
    style: { background },
    title: label,
    'aria-label': label,
    'aria-pressed': selected,
    onClick: () => { choose(value) },
  }, selected ? CHECK_GLYPH : null)
  const items = PRESETS.map(preset => swatch({
    key: preset.id,
    background: preset.swatch,
    value: preset.color,
    label: t(preset.labelKey),
    selected: current === preset.color,
  }))
  if (isCustom) {
    items.push(swatch({ key: 'custom', background: current, value: current, label: t('themeColor.preset.custom'), selected: true }))
  }
  return React.createElement('div', { 'data-dsh-theme-color-page': '' },
    React.createElement('div', { className: 'row' },
      React.createElement('div', { className: 'rowText' },
        React.createElement('div', { className: 'title' }, t('themeColor.presets.title')),
        React.createElement('div', { className: 'desc' }, t('themeColor.presets.description'))),
      React.createElement('div', { className: 'swatches' }, items)),
    React.createElement('div', { className: 'row' },
      React.createElement('div', { className: 'rowText' },
        React.createElement('div', { className: 'title' }, t('themeColor.custom.title')),
        React.createElement('div', { className: 'desc' }, t('themeColor.custom.description'))),
      React.createElement('input', {
        type: 'color',
        className: 'picker',
        value: current ?? DEFAULT_PICKER_COLOR,
        'aria-label': t('themeColor.custom.title'),
        onChange: event => {
          const rgb = parseHex(event.target.value)
          if (rgb !== null) choose(toHex(rgb))
        },
      })))
}

function apply(ctx) {
  let layerDispose
  /** Stack the layer for one canonical hex (or retract it for null); no storage side effects. */
  const applyLayer = color => {
    if (layerDispose !== undefined) { layerDispose(); layerDispose = undefined }
    const rgb = color === null ? null : parseHex(color)
    if (rgb !== null) layerDispose = ctx.theme.overrideTokens(LAYER_SOURCE, tokensOf(rgb))
  }
  /** The settings page's write entry: persist, then apply. */
  const setAccent = color => {
    try {
      if (color === null) localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, color)
    } catch {
      // Storage unavailable: still apply the override for this session.
    }
    applyLayer(color)
  }
  ctx.effect(() => {
    applyLayer(storedAccent())
    return () => { if (layerDispose !== undefined) layerDispose() }
  }, 'dsh-the-color: accent override layer')
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.plugin = 'dsh-the-color'
    style.textContent = PAGE_CSS
    document.head.appendChild(style)
    return () => { style.remove() }
  }, 'dsh-the-color: settings page styles')
  ctx.effect(() => ctx.locale.register(LOCALE_NS, LOCALES), 'dsh-the-color: settings dictionaries')
  const t = ctx.locale.bind(LOCALE_NS)
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'theme-color',
    order: 5,
    label: () => t('themeColor.nav'),
    locale: LOCALE_NS,
    inject: () => ({ setAccent }),
  }, ThemeColorSection))
}

exports.apply = apply
exports.inject = ['slots', 'locale', 'theme']
return module.exports; } });
