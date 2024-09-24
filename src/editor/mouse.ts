import Editor from "./index";

class Mouse {
  private editor: Editor;

  private prevSelection?: {
    focusNode: Node;
    focusOffset: number;
  };

  constructor(editor: Editor) {
    this.editor = editor;

    this.setupHandlers();
  }

  private hasSelectionChange(selection: Selection): boolean {
    if(!this.prevSelection) return false;

    return selection.focusNode !== this.prevSelection.focusNode
      || selection.focusOffset !== this.prevSelection.focusOffset;
  }

  private handleSelection(selection: Selection): void {
    if(selection.isCollapsed && this.hasSelectionChange(selection)) {
      const selNode = selection.focusNode as Node;
      const offset = selection.focusOffset;

      const cursorPos = this.editor.tree.getCursorPos(selNode, offset);

      if(cursorPos) {
        this.editor.updateCursorPos(cursorPos);
      }
    }

    this.prevSelection = {
      focusNode: selection.focusNode as Node,
      focusOffset: selection.focusOffset,
    };
  }

  private setupHandlers(): void {
    document.addEventListener("selectionchange", () => {
      const selection = window.getSelection();

      if(selection) this.handleSelection(selection);
    });
  }
}

export default Mouse;
