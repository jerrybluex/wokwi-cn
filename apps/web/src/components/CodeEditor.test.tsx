import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { EditorView } from '@codemirror/view';
import { CodeEditor } from './CodeEditor';

afterEach(() => cleanup());

describe('<CodeEditor />', () => {
  it('mounts into a host div and renders a CodeMirror content element', () => {
    const { getByTestId, container } = render(
      <CodeEditor value="void setup() {}" onChange={() => {}} />,
    );
    const host = getByTestId('code-editor');
    expect(host).toBeTruthy();
    // cm-editor is the root class CodeMirror 6 mounts
    const cm = host.querySelector('.cm-editor');
    expect(cm).toBeTruthy();
    // Code shows up in the doc
    const content = container.querySelector('.cm-content');
    expect(content?.textContent).toContain('void setup()');
  });

  it('shows line numbers and a fold gutter by default', () => {
    const { container } = render(<CodeEditor value="a\nb\nc" onChange={() => {}} />);
    expect(container.querySelector('.cm-lineNumbers')).toBeTruthy();
    expect(container.querySelector('.cm-foldGutter')).toBeTruthy();
  });

  it('reflects external value changes into the editor', () => {
    const { container, rerender } = render(
      <CodeEditor value="first" onChange={() => {}} />,
    );
    expect(container.querySelector('.cm-content')?.textContent).toContain('first');
    rerender(<CodeEditor value="second" onChange={() => {}} />);
    // CodeMirror takes a tick to apply doc changes
    expect(container.querySelector('.cm-content')?.textContent).toContain('second');
  });

  it('fires onChange when the user types', async () => {
    let captured: string | null = null;
    const { container, getByTestId } = render(
      <CodeEditor value="" onChange={(v) => (captured = v)} />,
    );
    const content = container.querySelector('.cm-content') as HTMLElement;
    expect(content).toBeTruthy();
    const host = getByTestId('code-editor');
    const view = EditorView.findFromDOM(host as HTMLElement);
    expect(view).toBeTruthy();
    view!.dispatch({ changes: { from: 0, insert: 'hi' } });
    expect(captured).toBe('hi');
  });
});
