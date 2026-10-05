/**
 * Self-check for the dsh-the-color browser half. Loads client.js exactly the
 * way the page does — through window.__ModuleLoader__.load and a materialized
 * factory — then drives apply() against service stubs and asserts behavior:
 * the default stacks no override layer (zero-diff), a stored accent stacks
 * exactly one ctx.theme layer with the expected token pairs, switching through
 * the settings-row setter retracts the previous layer and persists, unparsable
 * values fall back with one warning, the row registers into
 * settings.general.item with complete dictionaries, and the ladder calibration
 * stays within the documented delta.
 *
 * Usage: node tools/check-client.mjs
 */
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import assert from 'node:assert/strict'

const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
const STORAGE_KEY = 'dsh-the-color:accent'
const BRAND_ALIAS = '--dsw-alias-brand-primary-new-colorprimary-new-color'
const FAMILY = [
  '--dsw-static-deepseek-50', '--dsw-static-deepseek-100', '--dsw-static-deepseek-200',
  '--dsw-static-deepseek-300', '--dsw-static-deepseek-400', '--dsw-static-deepseek-450',
  '--dsw-static-deepseek-500', '--dsw-static-deepseek-800', '--dsw-static-deepseek-900',
  '--dsw-static-blue-950', '--dsw-static-blue-300', '--dsw-static-blue-450',
]
const STOCK = {
  '--dsw-static-deepseek-50': 'rgb(237, 243, 254)',
  '--dsw-static-deepseek-100': 'rgb(228, 237, 253)',
  '--dsw-static-deepseek-200': 'rgb(211, 226, 255)',
  '--dsw-static-deepseek-300': 'rgb(183, 200, 254)',
  '--dsw-static-deepseek-400': 'rgb(122, 170, 255)',
  '--dsw-static-deepseek-450': 'rgb(86, 134, 254)',
  '--dsw-static-deepseek-500': 'rgb(65, 118, 230)',
  '--dsw-static-deepseek-800': 'rgb(52, 65, 91)',
  '--dsw-static-deepseek-900': 'rgb(40, 49, 66)',
}

/** Load the bundle, materialize the plugin module, and run apply() once against service stubs. */
function run(stored) {
  const created = []
  const warnings = []
  const localeRegistrations = []
  const registeredDictionaries = new Map()
  const registrations = []
  const overrides = []
  const effects = []
  const writes = []
  const registration = { id: undefined, factory: undefined }
  const sandbox = {
    console: { log: console.log, warn: message => { warnings.push(String(message)) } },
    localStorage: {
      getItem: key => (key === STORAGE_KEY ? stored : null),
      setItem: (key, value) => { writes.push(['set', key, value]) },
      removeItem: key => { writes.push(['remove', key]) },
    },
    document: {
      createElement(tagName) {
        const el = { tagName, dataset: {}, textContent: '', removed: 0, remove() { this.removed += 1 } }
        created.push(el)
        return el
      },
      head: { appendChild() {} },
    },
    window: {
      __ModuleLoader__: {
        load(definition) {
          registration.id = definition.id
          registration.factory = definition.factory
        },
      },
    },
  }
  runInNewContext(source, sandbox)
  assert.equal(registration.id, 'dsh-the-color', 'bundle must register under the package name')
  const react = { createElement: () => null, useState: () => [0, () => {}] }
  const exports = registration.factory(specifier => {
    if (specifier === 'react') return react
    throw new Error(`unexpected require(${JSON.stringify(specifier)})`)
  })
  assert.equal(typeof exports.apply, 'function', 'materialized module must export apply')
  assert.deepEqual([...exports.inject].sort(), ['locale', 'slots', 'theme'])
  const ctx = {
    effect(callback, label) {
      const dispose = callback()
      effects.push({ dispose, label })
      return dispose
    },
    locale: {
      register(namespace, dictionaries) {
        localeRegistrations.push({ namespace, dictionaries })
        registeredDictionaries.set(namespace, dictionaries)
        return () => {}
      },
      bind(namespace) {
        return key => registeredDictionaries.get(namespace)?.zh?.[key] ?? key
      },
    },
    slots: {
      inject(name, callback) { return callback() },
      register(config, Component) {
        registrations.push({ config, Component })
        return () => {}
      },
    },
    theme: {
      overrideTokens(source, tokens) {
        const record = { source, tokens, disposed: 0 }
        overrides.push(record)
        return () => { record.disposed += 1 }
      },
    },
  }
  exports.apply(ctx)
  return { exports, created, warnings, localeRegistrations, registrations, overrides, effects, writes }
}

// 1. Structure: three effects, one page-style tag (no palette stylesheet), complete dictionaries, section registration.
{
  const { created, localeRegistrations, registrations, overrides, effects } = run(null)
  assert.equal(overrides.length, 0, 'default stacks no override layer')
  assert.equal(effects.length, 3, 'apply registers three effects')
  assert.equal(created.length, 1, 'exactly one style tag — the page styles, no palette stylesheet')
  const style = created[0]
  assert.equal(style.dataset.plugin, 'dsh-the-color')
  assert.ok(style.textContent.includes('[data-dsh-theme-color-page]'), 'page styles are scoped by the page data attribute')
  assert.equal(localeRegistrations.length, 1)
  const { namespace, dictionaries } = localeRegistrations[0]
  assert.equal(namespace, 'settings.theme-color')
  assert.deepEqual(Object.keys(dictionaries.zh).sort(), Object.keys(dictionaries.en).sort(), 'zh/en key sets must match')
  assert.equal(registrations.length, 1, 'exactly one registration — the settings section itself')
  const { config, Component } = registrations[0]
  assert.equal(config.name, 'settings.section')
  assert.equal(config.id, 'theme-color')
  assert.equal(config.order, 5, 'the section sits right after General (0) and before Models (10)')
  assert.equal(config.locale, 'settings.theme-color')
  assert.equal(typeof config.label, 'function')
  assert.equal(config.label(), '主题色', 'the nav label resolves through the registered dictionary')
  assert.equal(typeof config.inject, 'function')
  assert.equal(typeof Component, 'function')
  effects[1].dispose()
  assert.equal(style.removed, 1, 'page-style disposer removes the tag')
  console.log('PASS: settings section registers into settings.section with a locale-following nav label')
}

// 2. Default: no override layer at all (strongest form of the zero-diff default).
{
  const empty = run('')
  assert.equal(empty.overrides.length, 0, 'empty value must stack no layer')
  assert.equal(empty.warnings.length, 0, 'empty value falls back silently')
  console.log('PASS: default stacks no override layer (stock palette byte-identical)')
}

// 3. Custom stored accent: one layer, theme-invariant family pairs, per-scheme brand alias.
{
  const { overrides } = run('#7c3aed')
  assert.equal(overrides.length, 1, 'a stored accent stacks exactly one layer')
  const layer = overrides[0]
  assert.equal(layer.source, 'dsh-the-color', 'the layer is keyed by the package name')
  const accent = 'rgb(124, 58, 237)'
  for (const name of FAMILY) {
    const pair = layer.tokens[name]
    assert.ok(pair !== undefined && typeof pair.light === 'string' && pair.light === pair.dark, `${name} carries one theme-invariant pair`)
  }
  assert.equal(layer.tokens['--dsw-static-deepseek-500'].light, accent, 'deepseek-500 is the accent verbatim')
  const brand = layer.tokens[BRAND_ALIAS]
  assert.equal(brand.light, accent)
  assert.notEqual(brand.dark, brand.light, 'dark alias keeps the weaker 450 shade')
  assert.notEqual(brand.dark, STOCK['--dsw-static-deepseek-450'], 'dark alias follows the custom accent')
  console.log('PASS: stored accent stacks one layer with theme-invariant family pairs')
}

// 4. Switching through the injected setter: retract the old layer, persist, reset cleanly.
{
  const { registrations, overrides, writes, effects } = run(null)
  const injected = registrations[0].config.inject()
  assert.equal(typeof injected.setAccent, 'function')
  injected.setAccent('#22c55e')
  assert.deepEqual(writes, [['set', STORAGE_KEY, '#22c55e']], 'preset click persists the hex')
  assert.equal(overrides.length, 1)
  injected.setAccent('#ec4899')
  assert.equal(overrides.length, 2)
  assert.equal(overrides[0].disposed, 1, 'previous layer is retracted on switch')
  assert.equal(overrides[1].disposed, 0)
  injected.setAccent(null)
  assert.deepEqual(writes[2], ['remove', STORAGE_KEY], 'default click removes the stored key')
  assert.equal(overrides.length, 2)
  assert.equal(overrides[1].disposed, 1)
  effects[0].dispose()
  console.log('PASS: switching retracts the previous layer, persists, and resets cleanly')
}

// 5. Unparsable stored value: fallback with one warning.
{
  const bad = run('not-a-color')
  assert.equal(bad.overrides.length, 0)
  assert.equal(bad.warnings.length, 1)
  console.log('PASS: unparsable accent falls back to the stock palette with one warning')
}

// 6. Ladder calibration: the stock 500 as an accent keeps the deepseek family within Δ8 per channel.
// The blue-* partners are second-order surfaces whose stock values sit at a different hue, so
// unifying their hue moves them further by design and they are not asserted here.
{
  const { overrides } = run('#4176e6')
  const tokens = overrides[0].tokens
  let max = 0
  for (const [name, stockValue] of Object.entries(STOCK)) {
    const got = tokens[name].light.match(/\d+/gu).map(Number)
    const expected = stockValue.match(/\d+/gu).map(Number)
    max = Math.max(max, ...got.map((value, index) => Math.abs(value - expected[index])))
  }
  assert.ok(max <= 8, `stock accent must reproduce the deepseek family within Δ8 (got Δ${max})`)
  console.log(`PASS: stock-500 accent reproduces the deepseek family within Δ${max} per channel`)
}

console.log('check-client: all checks passed')
