import { useEffect, useRef } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  dropCursor,
  highlightSpecialChars,
} from '@codemirror/view';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands';
import { cpp } from '@codemirror/lang-cpp';
import {
  bracketMatching,
  indentOnInput,
  foldGutter,
  foldKeymap,
  syntaxHighlighting,
  defaultHighlightStyle,
} from '@codemirror/language';
import { oneDark } from '@codemirror/theme-one-dark';

/**
 * CodeEditor — CodeMirror 6 with C++ highlighting (Arduino is a C++ subset).
 *
 * Public API:
 *   <CodeEditor value={code} onChange={setCode} disabled={isRunning} />
 */
export interface CodeEditorProps {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  height?: string;
  theme?: 'dark' | 'light';
}

export function CodeEditor({
  value,
  onChange,
  disabled = false,
  height = '24rem',
  theme = 'dark',
}: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const editableCompRef = useRef<Compartment>(new Compartment());
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Mount once.
  useEffect(() => {
    if (!hostRef.current) return;
    const editableCompartment = editableCompRef.current;

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        highlightActiveLine(),
        highlightSpecialChars(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap, indentWithTab]),
        cpp(),
        theme === 'dark' ? oneDark : [],
        EditorView.theme({
          '&': { height, fontSize: '13px' },
          '.cm-scroller': { fontFamily: 'JetBrains Mono, Menlo, monospace' },
          '.cm-content': { padding: '8px 0' },
          '.cm-gutters': { background: '#0d1117', borderRight: '1px solid #1c2128' },
        }),
        editableCompartment.of(EditorState.readOnly.of(disabled)),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onChangeRef.current(u.state.doc.toString());
        }),
      ],
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push external value updates into the editor doc.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    });
  }, [value]);

  // Toggle readonly when disabled flips.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: editableCompRef.current.reconfigure(EditorState.readOnly.of(disabled)),
    });
  }, [disabled]);

  return (
    <div
      ref={hostRef}
      className="rounded-md border border-base-300 overflow-hidden bg-[#0d1117]"
      data-testid="code-editor"
    />
  );
}
