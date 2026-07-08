import type { Plugin } from 'vite'

/**
 * Design Mode — dev-only overlay.
 *
 * Click-and-point: enable the selector (floating button or Alt+A), hover the mouse
 * to highlight, click to capture. The element becomes a "selection token"
 * copied to the clipboard. Paste in Claude Code chat and it will know the
 * exact component + file:line + props.
 *
 * file:line comes from the `data-loc` attribute that babel-plugin-source-loc stamps
 * on each host element in dev (React 19 removed `fiber._debugSource`).
 * The fiber is still read for component name + props. `apply: 'serve'`.
 */
export default function designMode(): Plugin {
  return {
    name: 'openflaskcards-design-mode',
    apply: 'serve',
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          attrs: { type: 'module' },
          children: CLIENT,
          injectTo: 'body',
        },
      ]
    },
  }
}

const CLIENT = /* js */ `
(() => {
  // path fragments considered "dumb UI" — skipped when resolving call-site
  const UI_DIRS = ['src/shared/components/', 'components/ui/'];
  let active = false;
  let picks = [];
  let hovered = null;

  // ---- source location (DOM data-loc) ---------------------------------
  const isUi = (loc) =>
    !loc || loc.includes('node_modules') || UI_DIRS.some((d) => loc.includes(d));

  // exact location of element (or closest host ancestor)
  const selfLoc = (el) => {
    const node = el.closest('[data-loc]');
    return node ? node.getAttribute('data-loc') : null;
  };

  // call-site: first ancestor (including self) outside UI/node_modules
  function callSiteLoc(el) {
    let node = el.closest('[data-loc]');
    while (node) {
      const loc = node.getAttribute('data-loc');
      if (!isUi(loc)) return loc;
      const parent = node.parentElement;
      node = parent ? parent.closest('[data-loc]') : null;
    }
    return null;
  }

  // ---- fiber helpers (component name + props) ---------------------
  const getFiber = (node) => {
    const k = Object.keys(node).find(
      (k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
    );
    return k ? node[k] : null;
  };
  const compName = (t) =>
    !t ? null : typeof t === 'string' ? t : t.displayName || t.name || null;

  function inspect(el) {
    let f = getFiber(el);
    const chain = [];
    let component = null, props = null;
    while (f) {
      const name = compName(f.type);
      if (name && typeof f.type !== 'string') {
        chain.push(name);
        if (!component) {
          component = name;
          // props from SAME fiber that names component (avoids mismatch)
          if (f.memoizedProps) {
            const p = {};
            for (const k in f.memoizedProps) {
              if (k === 'children' || k === 'key' || k === 'ref' || k.startsWith('$$')) continue;
              const v = f.memoizedProps[k];
              if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') p[k] = v;
            }
            if (Object.keys(p).length) props = p;
          }
        }
      }
      f = f.return;
    }
    const loc = callSiteLoc(el) || selfLoc(el);
    const r = el.getBoundingClientRect();
    return {
      component,
      loc,
      props,
      text: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 40),
      bbox: { w: Math.round(r.width), h: Math.round(r.height) },
      chain: chain.slice(0, 6),
    };
  }

  function token(info) {
    const propStr = info.props
      ? ' ' + Object.entries(info.props)
          .map(([k, v]) => k + '=' + JSON.stringify(v))
          .join(' ')
      : '';
    const tag = info.component ? '<' + info.component + propStr + '>' : (info.text || '?');
    return '@sel ' + (info.loc || '?') + ' · ' + tag +
           (info.text ? ' · "' + info.text + '"' : '') +
           ' · ' + info.bbox.w + '×' + info.bbox.h;
  }

  // ---- overlay UI -------------------------------------------------------
  const mark = (el) => { el.setAttribute('data-dm', ''); return el; };

  const box = mark(document.createElement('div'));
  Object.assign(box.style, {
    position: 'fixed', pointerEvents: 'none', zIndex: 2147483646,
    border: '1px solid #2F73FF', background: 'rgba(47,115,255,.12)',
    borderRadius: '4px', display: 'none',
    boxShadow: '0 0 0 1px rgba(47,115,255,.4)',
  });
  const tip = mark(document.createElement('div'));
  Object.assign(tip.style, {
    position: 'fixed', pointerEvents: 'none', zIndex: 2147483647,
    font: '11px JetBrains Mono, monospace', color: '#fff',
    background: '#161618', border: '1px solid #2A2A30', borderRadius: '6px',
    padding: '4px 8px', display: 'none', whiteSpace: 'nowrap',
  });
  document.body.append(box, tip);

  function toast(msg, ok = true) {
    const t = mark(document.createElement('div'));
    Object.assign(t.style, {
      position: 'fixed', bottom: '64px', right: '16px', zIndex: 2147483647,
      pointerEvents: 'none',
      font: '12px JetBrains Mono, monospace', color: '#fff',
      background: ok ? 'rgba(53,200,120,.16)' : 'rgba(255,92,92,.16)',
      border: '1px solid ' + (ok ? '#35C878' : '#FF5C5C'), borderRadius: '8px',
      padding: '8px 12px', maxWidth: '420px', whiteSpace: 'pre-wrap',
      boxShadow: '0 6px 18px rgba(0,0,0,.55)',
    });
    t.textContent = msg;
    document.body.append(t);
    setTimeout(() => t.remove(), 2600);
  }

  // floating button
  const fab = mark(document.createElement('button'));
  fab.textContent = '◎ pick';
  Object.assign(fab.style, {
    position: 'fixed', bottom: '16px', right: '16px', zIndex: 2147483647,
    font: '12px JetBrains Mono, monospace', fontWeight: '600', color: '#9BA1AC',
    background: '#161618', border: '1px solid #2A2A30', borderRadius: '10px',
    padding: '8px 14px', cursor: 'pointer',
  });
  fab.onclick = () => setActive(!active);
  document.body.append(fab);

  function fabLabel() {
    if (!active) return '◎ pick';
    return picks.length ? '◎ picking… (' + picks.length + ')' : '◎ picking… (esc)';
  }
  function setActive(v) {
    active = v;
    picks = [];
    fab.style.color = v ? '#fff' : '#9BA1AC';
    fab.style.borderColor = v ? '#2F73FF' : '#2A2A30';
    fab.textContent = fabLabel();
    if (!v) { box.style.display = 'none'; tip.style.display = 'none'; }
  }

  function move(e) {
    if (!active) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el.closest('[data-dm]')) return;   // ignora overlay (fab/box/tip/toast)
    hovered = el;
    const r = el.getBoundingClientRect();
    Object.assign(box.style, {
      display: 'block', left: r.x + 'px', top: r.y + 'px',
      width: r.width + 'px', height: r.height + 'px',
    });
    const info = inspect(el);
    tip.textContent = (info.component || el.tagName.toLowerCase()) +
      (info.loc ? '  ' + info.loc : '');
    Object.assign(tip.style, {
      display: 'block', left: r.x + 'px',
      top: Math.max(0, r.y - 24) + 'px',
    });
  }

  // copy with legacy fallback for non-secure context (IP access)
  async function copy(text) {
    try {
      if (navigator.clipboard) { await navigator.clipboard.writeText(text); return true; }
    } catch {}
    const ta = mark(document.createElement('textarea'));
    ta.value = text;
    Object.assign(ta.style, { position: 'fixed', top: '0', opacity: '0', pointerEvents: 'none' });
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch {}
    ta.remove();
    return ok;
  }

  async function pick(e) {
    if (!active || !hovered) return;
    e.preventDefault();
    e.stopPropagation();
    const tk = token(inspect(hovered));
    if (e.shiftKey) {
      if (!picks.includes(tk)) picks.push(tk);   // dedupe
    } else {
      picks = [tk];
    }
    const payload = picks.join('\\n');
    const ok = await copy(payload);
    toast((ok ? 'copied — paste in chat:' : 'copy manually:') + '\\n' + payload, ok);
    if (e.shiftKey) fab.textContent = fabLabel();
    else setActive(false);
  }

  document.addEventListener('mousemove', move, true);
  document.addEventListener('click', pick, true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setActive(false);
    if (e.altKey && e.code === 'KeyA') setActive(true);   // Alt+A liga (layout-proof)
  });
})();
`
