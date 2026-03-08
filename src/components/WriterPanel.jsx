import { useEffect, useRef, useState } from "react";
import { NativeSelect, Tooltip } from "@mantine/core";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { defaultMarkdownSerializer } from "@tiptap/pm/markdown";
import { Button, Card } from "./AppUI.jsx";
import ToggleSwitch from "./ToggleSwitch.jsx";
import { DynamicHighlighter } from "../lib/tiptap-highlighter.js";
import { ELAB_DEPTHS, OUTPUT_PRESET_OPTIONS, TONE_LEVELS } from "../constants/index.js";
import { buildClicheRanges } from "../utils/index.js";
import { renderMarkdownToHtml } from "../utils/markdown.js";

const ADD_CUSTOM_MODEL_VALUE = "__add_custom_model__";
const IS_TEST_ENV =
  typeof import.meta !== "undefined" &&
  Boolean(import.meta.env?.MODE === "test" || import.meta.env?.VITEST);

function normalizeMarkdown(text) {
  return String(text || "").replace(/\r\n/g, "\n").replace(/\n+$/, "").trim();
}

function serializeEditorMarkdown(editor) {
  return defaultMarkdownSerializer.serialize(editor.state.doc).replace(/\r\n/g, "\n").replace(/\n+$/, "");
}

function TiptapInput({
  inputText,
  onChange,
  mode,
  cliches,
  canAttemptSubmit,
  onSubmit,
}) {
  const hasFocusedRef = useRef(false);
  const canSubmitRef = useRef(canAttemptSubmit);
  const onSubmitRef = useRef(onSubmit);

  canSubmitRef.current = canAttemptSubmit;
  onSubmitRef.current = onSubmit;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        strike: false,
      }),
      Placeholder.configure({
        placeholder: mode === "humanize" ? "Paste AI-generated text here…" : "Write something to elaborate on…",
      }),
      DynamicHighlighter.configure({
        getRanges: (text) => {
          if (!text) return [];
          return buildClicheRanges(text, cliches).map((range) => ({
            start: range.start,
            end: range.end,
            kind: "cliche",
          }));
        },
      }),
    ],
    content: renderMarkdownToHtml(inputText),
    onUpdate: ({ editor }) => {
      const markdown = serializeEditorMarkdown(editor);
      if (normalizeMarkdown(markdown) !== normalizeMarkdown(inputText)) {
        onChange(markdown);
      }
    },
    editorProps: {
      handleKeyDown: (_view, event) => {
        if (event.key !== "Enter" || event.shiftKey) return false;
        if (!canSubmitRef.current) return false;
        event.preventDefault();
        onSubmitRef.current?.();
        return true;
      },
      attributes: {
        class: "editor-textarea tiptap-editor",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;

    if (!hasFocusedRef.current) {
      hasFocusedRef.current = true;
      queueMicrotask(() => {
        try {
          editor.commands.focus("end");
        } catch {}
      });
    }

    const editorMarkdown = serializeEditorMarkdown(editor);
    if (normalizeMarkdown(editorMarkdown) !== normalizeMarkdown(inputText)) {
      const { from, to } = editor.state.selection;
      editor.commands.setContent(renderMarkdownToHtml(inputText), false);
      try {
        editor.commands.setTextSelection({
          from: Math.min(from, editor.state.doc.content.size),
          to: Math.min(to, editor.state.doc.content.size),
        });
      } catch {}
    }

    editor.view.dispatch(editor.state.tr.setMeta("dynamicHighlighterUpdate", true));
  }, [inputText, editor, cliches]);

  return <EditorContent editor={editor} style={{ display: "flex", flex: 1, minHeight: 0 }} />;
}

function EditorIcon({ children }) {
  return (
    <span className="editor-action-icon" aria-hidden="true">
      {children}
    </span>
  );
}

function DepthScaleIcon({ level, active }) {
  return (
    <span className={`editor-depth-scale-icon${active ? " is-active" : ""}`} aria-hidden="true">
      {[0, 1, 2].map((step) => (
        <span
          key={step}
          className="editor-depth-scale-bar"
          style={{ height: `${6 + Math.max(level - 2 + step, 0) * 3}px` }}
        />
      ))}
    </span>
  );
}

function ToneScaleIcon({ level }) {
  const dotSize = [6, 8, 10, 12, 14][level] ?? 10;
  const lineWidth = [8, 10, 12, 14, 16][level] ?? 12;

  return (
    <span className="editor-tone-scale-icon" aria-hidden="true">
      <span className="editor-tone-scale-dot" style={{ width: `${dotSize}px`, height: `${dotSize}px` }} />
      <span className="editor-tone-scale-line" style={{ width: `${lineWidth}px` }} />
    </span>
  );
}

function ToolbarScale({ label, children }) {
  return (
    <div className="editor-toolbar-control">
      <span className="text-mono editor-toolbar-label">{label}</span>
      {children}
    </div>
  );
}

export default function WriterPanel({
  inputText,
  onChange,
  mode,
  onModeChange,
  loading,
  progressLabel,
  progressTone = "neutral",
  hasStyle,
  words,
  cliches,
  toneLevel,
  onToneLevelChange,
  stripCliches,
  onStripClichesChange,
  elabDepth,
  onElabDepthChange,
  formatPreset,
  onFormatPresetChange,
  oneOffInstruction,
  onOneOffInstructionChange,
  selectedModel,
  onModelChange,
  modelOptions,
  onAddModel,
  onSubmit,
}) {
  const textareaRef = useRef(null);
  const instructionInputRef = useRef(null);
  const previousInstructionRef = useRef(oneOffInstruction);
  const minChars = mode === "humanize" ? 20 : 10;
  const busy = loading;
  const canAttemptSubmit = !busy && inputText.trim().length >= minChars;
  const [instructionOpen, setInstructionOpen] = useState(Boolean(oneOffInstruction?.trim()));

  async function pasteFromClipboard() {
    try {
      if (!navigator?.clipboard?.readText) return;
      const pastedText = await navigator.clipboard.readText();
      if (typeof pastedText !== "string") return;
      onChange(pastedText);
    } catch {}
  }

  useEffect(() => {
    if (!IS_TEST_ENV) return;
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const hadInstruction = Boolean(previousInstructionRef.current?.trim());
    const hasInstruction = Boolean(oneOffInstruction?.trim());

    if (!hadInstruction && hasInstruction) {
      setInstructionOpen(true);
    }

    previousInstructionRef.current = oneOffInstruction;
  }, [oneOffInstruction]);

  useEffect(() => {
    if (!instructionOpen) return;
    instructionInputRef.current?.focus();
  }, [instructionOpen]);

  return (
    <>
      <Card
        className={`app-card editor-card editor-card--${mode}`}
        style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
        radius="lg"
      >
        <Card.Content className="p-0" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <div className="editor-topbar">
            <div className="toolbar-row editor-topbar-controls" style={{ gap: 8 }}>
              <Button
                size="sm"
                color={mode === "humanize" ? "primary" : "default"}
                variant={mode === "humanize" ? "solid" : "bordered"}
                onPress={() => onModeChange("humanize")}
                aria-label="Switch to humanize mode"
                tooltip="Rewrite text to sound like your voice"
                iconOnly
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 12h16" />
                  <path d="M4 18h10" />
                  <path d="M4 6h13" />
                </svg>
              </Button>
              <Button
                size="sm"
                color={mode === "elaborate" ? "primary" : "default"}
                variant={mode === "elaborate" ? "solid" : "bordered"}
                onPress={() => onModeChange("elaborate")}
                aria-label="Switch to elaborate mode"
                tooltip="Expand the draft with more detail"
                iconOnly
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 12h8" />
                  <path d="M4 18h16" />
                  <path d="M4 6h5" />
                  <path d="M16 9v6" />
                  <path d="M13 12h6" />
                </svg>
              </Button>
              {mode === "elaborate" ? (
                <ToolbarScale label="Depth">
                  <div className="editor-depth-toolbar" aria-label="Elaboration depth">
                    {ELAB_DEPTHS.map((depth, index) => {
                      const active = index === elabDepth;
                      return (
                        <Tooltip key={depth.label} label={`${depth.label}: ${depth.desc}`} withArrow openDelay={1500}>
                          <button
                            type="button"
                            className={`editor-depth-button${active ? " is-active" : ""}`}
                            onClick={() => onElabDepthChange(index)}
                            aria-label={`Set depth to ${depth.label}`}
                            aria-pressed={active}
                          >
                            <DepthScaleIcon level={index} active={active} />
                          </button>
                        </Tooltip>
                      );
                    })}
                  </div>
                </ToolbarScale>
              ) : null}
              {mode === "humanize" ? (
                <ToolbarScale label="Tone">
                  <div className="editor-depth-toolbar" aria-label="Rewrite tone">
                    {TONE_LEVELS.map((tone, index) => {
                      const active = index === toneLevel;
                      return (
                        <Tooltip key={tone.label} label={`${tone.label}: ${tone.desc}`} withArrow openDelay={1500}>
                          <button
                            type="button"
                            className={`editor-depth-button${active ? " is-active" : ""}`}
                            onClick={() => onToneLevelChange(index)}
                            aria-label={`Set tone to ${tone.label}`}
                            aria-pressed={active}
                          >
                            <ToneScaleIcon level={index} />
                          </button>
                        </Tooltip>
                      );
                    })}
                  </div>
                </ToolbarScale>
              ) : null}
              <ToolbarScale label="Preset">
                <NativeSelect
                  value={formatPreset}
                  onChange={(event) => onFormatPresetChange(event.currentTarget.value)}
                  aria-label="Output format preset"
                  className="app-select-wrap editor-topbar-select"
                  data={OUTPUT_PRESET_OPTIONS.map((preset) => ({ value: preset.value, label: preset.label }))}
                />
              </ToolbarScale>
              <ToolbarScale label="AI filter">
                <ToggleSwitch value={stripCliches} onChange={onStripClichesChange} />
              </ToolbarScale>
            </div>

            <div className="toolbar-row editor-topbar-meta">
              {mode === "humanize" ? (
                <span className="text-mono editor-depth-label">{TONE_LEVELS[toneLevel].label}</span>
              ) : null}
              {mode === "elaborate" ? (
                <span className="text-mono editor-depth-label">{ELAB_DEPTHS[elabDepth].label}</span>
              ) : null}
              <span className="text-mono editor-word-count">{words} words</span>
            </div>
          </div>

          <div className="editor-wrap tiptap-wrap">
            <div className="editor-canvas">
              {IS_TEST_ENV ? (
                <textarea
                  ref={textareaRef}
                  className="editor-textarea"
                  placeholder={mode === "humanize" ? "Paste AI-generated text here…" : "Write something to elaborate on…"}
                value={inputText}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && canAttemptSubmit) {
                    event.preventDefault();
                    onSubmit();
                  }
                }}
                autoFocus
              />
            ) : (
              <TiptapInput
                inputText={inputText}
                onChange={onChange}
                mode={mode}
                cliches={cliches}
                canAttemptSubmit={canAttemptSubmit}
                onSubmit={onSubmit}
              />
            )}
              <div className="editor-command-row">
                <div className="toolbar-row editor-quick-actions">
                  <Button
                    size="sm"
                    variant="bordered"
                    onPress={pasteFromClipboard}
                    aria-label="Paste input"
                    tooltip="Paste from clipboard"
                    iconOnly
                  >
                    <EditorIcon>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="3" width="6" height="4" rx="1" />
                        <path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                      </svg>
                    </EditorIcon>
                  </Button>
                  <Button size="sm" variant="light" onPress={() => onChange("")} isDisabled={!inputText} aria-label="Clear input" tooltip="Clear the editor" iconOnly>
                    <EditorIcon>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="m19 6-1 14H6L5 6" />
                      </svg>
                    </EditorIcon>
                  </Button>
                </div>

                <div className="editor-command-right">
                  <div className={`editor-instruction-dock${instructionOpen ? " is-open" : ""}`}>
                    <div className="editor-instruction-panel" aria-hidden={!instructionOpen}>
                      <input
                        ref={instructionInputRef}
                        type="text"
                        className="editor-instruction-input"
                        value={oneOffInstruction}
                        onChange={(e) => onOneOffInstructionChange(e.target.value)}
                        placeholder="One-off instruction (example: cut 30 words)"
                        aria-label="One-off instruction"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant={instructionOpen ? "solid" : "bordered"}
                      color={oneOffInstruction?.trim() ? "primary" : "default"}
                      onPress={() => setInstructionOpen((open) => !open)}
                      aria-label={instructionOpen ? "Hide one-off instruction" : "Show one-off instruction"}
                      className="editor-instruction-trigger"
                      iconOnly
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 5v14" />
                        <path d="M5 12h14" />
                      </svg>
                    </Button>
                  </div>

                  <div className="toolbar-row editor-send-cluster">
                    <NativeSelect
                      value={selectedModel}
                      onChange={(e) => {
                        if (e.currentTarget.value === ADD_CUSTOM_MODEL_VALUE) {
                          onAddModel();
                          return;
                        }
                        onModelChange(e.currentTarget.value);
                      }}
                      className="app-select-wrap editor-model-select"
                      aria-label="Select model"
                      data={[
                        ...modelOptions.map((m) => ({ value: m.value, label: m.label })),
                        { value: ADD_CUSTOM_MODEL_VALUE, label: "+ Add custom model..." },
                      ]}
                    />
                    <Button
                      color="primary"
                      onPress={onSubmit}
                      isDisabled={!canAttemptSubmit}
                      aria-label={
                        loading
                          ? mode === "humanize" ? "Rewriting" : "Expanding"
                          : !hasStyle
                            ? "Onboard profile first"
                            : mode === "humanize" ? "Humanize text" : "Elaborate text"
                      }
                      tooltip={
                        loading
                          ? mode === "humanize" ? "Rewriting your draft" : "Expanding your draft"
                          : !hasStyle
                            ? "Press send after onboarding a profile"
                            : hasStyle
                              ? mode === "humanize"
                                ? "Send the draft to rewrite in your voice"
                                : "Expand the draft with more detail"
                              : ""
                      }
                      iconOnly
                      className="editor-send-button"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14" />
                        <path d="m19 12-7-7-7 7" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="toolbar-row editor-footer">
            {loading ? (
              <div
                className={`editor-request-progress${progressTone !== "neutral" ? ` editor-request-progress--${progressTone}` : ""}`}
                aria-live="polite"
                aria-label={progressLabel || "Request in progress"}
              >
                <span className="text-mono editor-request-progress-label">{progressLabel || "Working..."}</span>
                <div className="editor-request-progress-track" aria-hidden="true">
                  <span className="editor-request-progress-bar" />
                </div>
              </div>
            ) : null}
          </div>
        </Card.Content>
      </Card>
    </>
  );
}
