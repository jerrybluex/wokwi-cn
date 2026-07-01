/**
 * Tiny SVG element factory. Returns the new element with attrs applied.
 * Use this from each part file to keep render() functions concise.
 */
const NS = 'http://www.w3.org/2000/svg';

export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number | undefined> = {},
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const k of Object.keys(attrs)) {
    const v = attrs[k];
    if (v !== undefined && v !== null) {
      el.setAttribute(k, String(v));
    }
  }
  return el;
}

/** Append multiple children to a parent. */
export function appendAll(parent: SVGElement, children: SVGElement[]): SVGElement {
  for (const c of children) parent.appendChild(c);
  return parent;
}
