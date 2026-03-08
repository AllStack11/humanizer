import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const BLOCK_SEPARATOR = "\n\n";

function findMatches(doc, getRanges) {
  const decorations = [];
  const fullText = doc.textBetween(0, doc.content.size, BLOCK_SEPARATOR, BLOCK_SEPARATOR);
  const ranges = (getRanges(fullText) || [])
    .filter((range) => Number.isInteger(range?.start) && Number.isInteger(range?.end) && range.end > range.start);

  doc.descendants((node, pos) => {
    if (!node.isText) {
      return;
    }

    const text = node.text || "";
    if (!text) return;

    const textStart = doc.textBetween(0, pos, BLOCK_SEPARATOR, BLOCK_SEPARATOR).length;
    const textEnd = textStart + text.length;

    ranges.forEach((range) => {
      const overlapStart = Math.max(range.start, textStart);
      const overlapEnd = Math.min(range.end, textEnd);
      if (overlapEnd <= overlapStart) return;

      const attrs = range.kind === "error"
        ? {
            nodeName: "mark",
            class: "mark-error",
          }
        : range.kind === "cliche"
          ? {
              nodeName: "mark",
              class: "mark-cliche",
            }
          : null;

      if (!attrs) return;

      const from = pos + (overlapStart - textStart);
      const to = pos + (overlapEnd - textStart);
      if (to <= from) return;

      decorations.push(Decoration.inline(from, to, attrs));
    });
  });

  return DecorationSet.create(doc, decorations);
}

export const DynamicHighlighter = Extension.create({
  name: "dynamicHighlighter",

  addOptions() {
    return {
      getRanges: () => [],
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("dynamicHighlighter"),
        state: {
          init: (_, { doc }) => findMatches(doc, this.options.getRanges),
          apply: (tr, oldState) => {
            if (!tr.docChanged && !tr.getMeta("dynamicHighlighterUpdate")) {
              return oldState.map(tr.mapping, tr.doc);
            }
            return findMatches(tr.doc, this.options.getRanges);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});
