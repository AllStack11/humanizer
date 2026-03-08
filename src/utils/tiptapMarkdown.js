import { MarkdownSerializer, defaultMarkdownSerializer } from "@tiptap/pm/markdown";

const NODE_SERIALIZERS = {
  ...defaultMarkdownSerializer.nodes,
  bulletList: defaultMarkdownSerializer.nodes.bullet_list,
  orderedList: defaultMarkdownSerializer.nodes.ordered_list,
  listItem: defaultMarkdownSerializer.nodes.list_item,
  codeBlock: defaultMarkdownSerializer.nodes.code_block,
  hardBreak: defaultMarkdownSerializer.nodes.hard_break,
  horizontalRule: defaultMarkdownSerializer.nodes.horizontal_rule,
};

const MARK_SERIALIZERS = {
  ...defaultMarkdownSerializer.marks,
  italic: defaultMarkdownSerializer.marks.em,
  bold: defaultMarkdownSerializer.marks.strong,
  strike: {
    open: "~~",
    close: "~~",
    mixable: true,
    expelEnclosingWhitespace: true,
  },
};

const TIPTAP_MARKDOWN_SERIALIZER = new MarkdownSerializer(
  NODE_SERIALIZERS,
  MARK_SERIALIZERS,
  defaultMarkdownSerializer.options
);

function normalizeMarkdownOutput(text) {
  return String(text || "").replace(/\r\n/g, "\n").replace(/\n+$/, "");
}

export function serializeTiptapEditorToMarkdown(editor) {
  if (!editor?.state?.doc) return "";

  try {
    return normalizeMarkdownOutput(TIPTAP_MARKDOWN_SERIALIZER.serialize(editor.state.doc));
  } catch {
    try {
      return normalizeMarkdownOutput(editor.getText({ blockSeparator: "\n\n" }));
    } catch {
      return "";
    }
  }
}

