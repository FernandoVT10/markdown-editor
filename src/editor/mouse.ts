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

  private handlePointSelection(selection: Selection): void {
    const selNode = selection.focusNode as Node;
    const offset = selection.focusOffset;

    const cursorPos = this.editor.tree.getCursorPos(selNode, offset);

    if(cursorPos) {
      this.editor.updateCursorPos(cursorPos);
    }
  }

  private handleRectangleSelection(selection: Selection): void {
    const startNode = selection.anchorNode as Node;
    const startOffset = selection.anchorOffset;
    const endNode = selection.focusNode as Node;
    const endOffset = selection.focusOffset;

    const startPos = this.editor.tree.getCursorPos(startNode, startOffset);
    const endPos = this.editor.tree.getCursorPos(endNode, endOffset);

    if(startPos !== undefined && endPos !== undefined) {
      // the selection in the browser can be made backwards
      if(startPos.line > endPos.line || (startPos.line === endPos.line && startPos.col > endPos.col)) {
        this.editor.updateCursorSelection(endPos, startPos);
      } else {
        this.editor.updateCursorSelection(startPos, endPos);
      }
    }
  }

  private handleImageSelection(target: HTMLElement): void {
    const tagName = target.tagName.toLowerCase();

    // This sets the cursor on the markdown text of the image if the click started
    // on the image and ended on the image
    if(this.startingTarget?.isSameNode(target) && tagName === "img") {
      const cursorPos = this.editor.tree.getCursorPos(
        target.parentNode as Node, 0
      );

      if(cursorPos) {
        this.editor.updateCursorPos(cursorPos);
      }
    }
  }

  private handleListMarkerSel(target: HTMLElement) {
    const tagName = target.tagName.toLowerCase();

    if(tagName === "span") {
      const cursorPos = this.editor.tree.getCursorPos(target, 0);

      if(cursorPos) {
        this.editor.updateCursorPos(cursorPos);
      }
    }
  }

  private setupHandlers(container: HTMLElement): void {
    document.addEventListener("selectionchange", () => {
      const selection = window.getSelection();
      if(!selection) return;

      if(selection.isCollapsed && this.hasSelectionChange(selection)) {
        this.handlePointSelection(selection);
      } else if(!selection.isCollapsed) {
        this.handleRectangleSelection(selection);
      }

      this.prevSelection = {
        focusNode: selection.focusNode as Node,
        focusOffset: selection.focusOffset,
      };
    });

    container.addEventListener("mousedown", e => {
      this.editor.saveTypedBuffer();
      this.startingTarget = e.target as HTMLElement;
    });

    container.addEventListener("mouseup", e => {
      const selection = window.getSelection();
      if(!selection) return;

      this.handleImageSelection(e.target as HTMLElement);
      this.handleListMarkerSel(e.target as HTMLSpanElement);
    });
  }
}

export default Mouse;
