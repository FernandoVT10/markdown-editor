import Editor from "./index";

class Mouse {
  private editor: Editor;

  private prevSelection?: {
    focusNode: Node;
    focusOffset: number;
  };

  private startingTarget?: HTMLElement;

  constructor(editor: Editor) {
    this.editor = editor;

    this.setupHandlers(editor.container);
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

  private handleImageSelection(target: HTMLElement): void {
    const tagName = target.tagName.toLowerCase();

    // This sets the cursor on the markdown text of the image if the click started
    // on the image and ended on the image
    if(this.startingTarget?.isSameNode(target) && tagName === "img") {
      let cursorPos = this.editor.tree.getCursorPos(
        target.parentNode as Node, 0
      );

      if(cursorPos) {
        this.editor.updateCursorPos(cursorPos);
      }
    }
  }

  private setupHandlers(container: HTMLElement): void {
    document.addEventListener("selectionchange", () => {
      const selection = window.getSelection();

      if(selection) this.handleSelection(selection);
    });

    container.addEventListener("mousedown", e => {
      this.editor.saveTypedBuffer();
      this.startingTarget = e.target as HTMLElement;
    });

    container.addEventListener("mouseup", e => {
      const selection = window.getSelection();
      if(!selection) return;

      this.handleImageSelection(e.target as HTMLElement);
    });
  }
}

export default Mouse;
