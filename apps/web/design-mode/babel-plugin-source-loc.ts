import type { PluginObj, types as BabelTypes } from "@babel/core"

/**
 * Dev-only Babel plugin. Stamps `data-loc="file:line"` on every host JSX
 * element (lowercase tag → real DOM node), so Design Mode can read the
 * source location straight from the DOM.
 *
 * React 19 removed `fiber._debugSource`, so the old fiber-walking approach
 * no longer yields file:line. Stamping the DOM is version-proof.
 *
 * Only added when Vite runs in `serve` mode — never ships to prod.
 */
export default function sourceLoc({
  types: t,
}: {
  types: typeof BabelTypes
}): PluginObj {
  return {
    name: "design-mode-source-loc",
    visitor: {
      JSXOpeningElement(path, state) {
        const name = path.node.name
        // host elements only (lowercase first char) — they map to DOM nodes
        if (name.type !== "JSXIdentifier" || !/^[a-z]/.test(name.name)) return

        const already = path.node.attributes.some(
          (a) => a.type === "JSXAttribute" && a.name.name === "data-loc",
        )
        if (already) return

        const line = path.node.loc?.start.line
        if (!line) return

        const filename = state.filename || ""
        const file = filename.includes("/apps/web/")
          ? filename.split("/apps/web/").pop()!
          : filename.split("/").slice(-2).join("/")

        path.node.attributes.push(
          t.jsxAttribute(
            t.jsxIdentifier("data-loc"),
            t.stringLiteral(file + ":" + line),
          ),
        )
      },
    },
  }
}
