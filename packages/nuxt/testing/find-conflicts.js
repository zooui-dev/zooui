// Guard for the bug class behind 1.6.0 and 1.6.1: two utilities on one element setting the same
// property in the same context. Tailwind resolves that by its GENERATED order (colors sort
// alphabetically, spacing numerically) — never by the order the classes are written — so
// `text-fg-muted` silently beat `text-fg` and `border-transparent` beat `border-border-strong`.
//
// It reads the real built stylesheet, maps every class to {context → properties}, and flags an
// element carrying two classes whose property sets are IDENTICAL in the same context (context =
// the selector with the class removed, plus enclosing @media/@container/@supports). Identical sets
// is deliberate: Tailwind's designed pairs — `p-0 px-3`, `text-sm leading-code`, `border border-b-2`
// — set different properties and are ordered on purpose. Also flagged: a `font` shorthand next to
// any font longhand (a type-* composite stacked with a size/weight/family/leading utility), and
// any `all` reset.
//
// Shared: the layer's test apps and every Zoo UI product run it. In a Playwright test:
//   import { findConflicts } from '@zooui/nuxt/testing/find-conflicts'
//   expect(await page.evaluate(findConflicts)).toEqual([])
// It runs INSIDE the page (page.evaluate serializes it), so it must stay self-contained — no imports.
//
// Plain JavaScript, not TypeScript: a consumer loads it from node_modules, where Node will not strip types
// ("Stripping types is currently unsupported for files under node_modules"). Types: find-conflicts.d.ts.
/** Runs in the page. Returns one line per conflicting pair. */
export function findConflicts() {
    const byClass = new Map();
    const unescape = (s) => s.replace(/\\(.)/g, '$1');
    const walk = (rules, at) => {
        for (const r of rules) {
            if (r instanceof CSSStyleRule) {
                for (const sel of r.selectorText.split(/,(?![^(]*\))/)) {
                    const m = sel.trim().match(/^\.((?:\\.|[^\s.:[#>+~,()\\])+)(.*)$/);
                    if (!m)
                        continue;
                    // Tailwind's own --tw-* variables stay IN the signature: shadow-sm and ring-0 both write
                    // box-shadow, but through the shared formula, one via --tw-shadow and one via
                    // --tw-ring-shadow — they compose, so their signatures must differ. Other custom
                    // properties (tokens, --radius-* re-declarations) are not what a conflict is about.
                    const props = [...r.style].filter((p) => !p.startsWith('--') || p.startsWith('--tw-'));
                    // A `font:` shorthand (a type-* composite) is recognized by what it SETS as well as by "font:"
                    // in cssText: with var() values plus a later font-feature-settings, the browser serializes
                    // the rule as longhands and the text "font:" disappears (core 1.9.3 gave composites a set).
                    const decl = r.style.cssText;
                    if (/(^|;\s*)font\s*:/.test(decl) || (props.includes('font-family') && props.includes('font-size') && props.includes('line-height')))
                        props.push('font(shorthand)');
                    if (!props.length)
                        continue;
                    // One entry per (class, context), with the UNION of its properties: the minifier merges
                    // identical declarations across selectors (`.border-2,.border-[1.5px]{border-style:…}`),
                    // splitting one utility over several rules — compared rule by rule, border-[1.5px] looked
                    // like a style-only utility and collided with border-dashed.
                    const cls = unescape(m[1]);
                    const ctx = [...at, m[2] ?? ''].join(' | ');
                    const list = byClass.get(cls) ?? [];
                    const entry = list.find((e) => e.ctx === ctx);
                    if (entry)
                        entry.props = [...new Set([...entry.props, ...props])].sort();
                    else
                        list.push({ ctx, props });
                    byClass.set(cls, list);
                }
                if (r.cssRules?.length)
                    walk(r.cssRules, [...at, '&' + r.selectorText]);
            }
            else if ('cssRules' in r) {
                const cond = r instanceof CSSLayerBlockRule ? null
                    : r.conditionText ?? r.cssText.slice(0, r.cssText.indexOf('{'));
                walk(r.cssRules, cond ? [...at, cond] : at);
            }
        }
    };
    for (const sheet of document.styleSheets) {
        try {
            walk(sheet.cssRules, []);
        }
        catch { /* cross-origin */ }
    }
    const FONT_LONGHANDS = ['font-size', 'font-weight', 'font-family', 'line-height', 'font-style'];
    const out = new Set();
    for (const el of document.querySelectorAll('[class]')) {
        const classes = [...el.classList].filter((c) => byClass.has(c));
        for (const c of classes) {
            for (const e of byClass.get(c))
                if (e.props.includes('all'))
                    out.add(`[all] ${c}`);
        }
        for (let i = 0; i < classes.length; i++) {
            for (let j = i + 1; j < classes.length; j++) {
                for (const a of byClass.get(classes[i])) {
                    for (const b of byClass.get(classes[j])) {
                        if (a.ctx !== b.ctx)
                            continue;
                        const same = a.props.join() === b.props.join();
                        const stacked = (a.props.includes('font(shorthand)') && b.props.some((p) => FONT_LONGHANDS.includes(p)))
                            || (b.props.includes('font(shorthand)') && a.props.some((p) => FONT_LONGHANDS.includes(p)));
                        if (same || stacked) {
                            const where = el.id ? `#${el.id}` : `<${el.tagName.toLowerCase()} class="${el.className}">`.slice(0, 140);
                            out.add(`${classes[i]} × ${classes[j]} [${a.props.join(',')}]${a.ctx.trim() ? ` in "${a.ctx.trim()}"` : ''} on ${where}`);
                        }
                    }
                }
            }
        }
    }
    return [...out];
}
