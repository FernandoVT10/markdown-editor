import Tree from "./tree";
import Cursor from "./cursor";
import parser from "./parser";
import { isalnum, isSpecialAction } from "./utils";
import { DEBUG, logInfo } from "./debug";

import "./styles.css";

type HistoryItem = {
  cursorPos: number;
  buffer: string;
}

const emptyHistoryItem: HistoryItem = {
  cursorPos: 0,
  buffer: "",
};

class History {
  private array: HistoryItem[] = [];
  private cursor = 0;

  save(buffer: string, cursorPos: number): void {
    if(this.array.length && this.array[this.cursor - 1].buffer === buffer) return;

    this.cursor++;
    this.array.push({ buffer, cursorPos });
  }

  get(): HistoryItem {
    if(this.array.length === 0 || this.cursor === 0) return emptyHistoryItem;
    return this.array[this.cursor - 1];
  }

  hasBeenUndone(): boolean {
    return this.cursor < this.array.length;
  }

  undo(): boolean {
    if(this.cursor > 0) {
      this.cursor--;
      return true;
    }
    return false;
  }

  redo(): boolean {
    if(this.cursor < this.array.length) {
      this.cursor++;
      return true;
    }

    return false;
  }

  clearAfterCursor(): void {
    this.array = this.array.slice(0, this.cursor);
  }
}

class Editor {
  private container: HTMLDivElement;
  private tree: Tree | undefined;
  private buffer = "";
  private bufferUpdated = false;
  private wasCursorCollapsed = true;

  private history = new History;

  constructor(container: HTMLDivElement) {
    this.container = container;
    this.setupKeydownListener();
    this.setupMouseEvents();
    this.setupSpecialEvents();
  }

  private updateCursor(): void {
    if(this.tree) this.tree.onCursorUpdate();
  }

  private updateTree() {
    logInfo("Starting to parse...");
    const t = Date.now();
    this.tree = parser(this.buffer);
    const ms = Date.now() - t;
    logInfo(`Parsing took: ${ms}ms`);

    this.tree.render(this.container);
    this.tree.onCursorUpdate();
  }

  private updateBuffer(newBuffer: string, clearHistory = true) {
    if(this.history.hasBeenUndone() && clearHistory) {
      this.history.clearAfterCursor();
    }

    this.buffer = newBuffer;
    Cursor.updateLines(this.buffer);

    this.updateTree();

    this.bufferUpdated = true;
  }

  private addCharacter(char: string): void {
    if(char.length > 1) return;

    if(!Cursor.isCollapsed()) this.removeSelection();

    const cursorPos = Cursor.getPos();
    const leftPart = this.buffer.slice(0, cursorPos);
    const rightPart = this.buffer.slice(cursorPos);

    Cursor.setPos(cursorPos + 1);

    this.updateBuffer(leftPart + char + rightPart);
  }

  private removeCharacter(): void {
    const len = this.buffer.length;
    if(len > 0) {
      const cursorPos = Cursor.getPos();

      if(cursorPos > 0) {
        const leftPart = this.buffer.slice(0, cursorPos - 1);
        const rightPart = this.buffer.slice(cursorPos);

        this.saveHistory();

        Cursor.setPos(cursorPos - 1);
        this.updateBuffer(leftPart + rightPart, false);
      }
    }
  }

  private removeSequenceOfChars(): void {
    const len = this.buffer.length;
    if(len > 0) {
      const cursorPos = Cursor.getPos();

      if(!isalnum(this.buffer.charAt(cursorPos - 1))) {
        return this.removeCharacter();
      }

      if(cursorPos > 0) {
        let count = 1;

        while(isalnum(this.buffer.charAt(cursorPos - 1 - count)) && cursorPos - count > 0) {
          count++;
        }

        const leftPart = this.buffer.slice(0, cursorPos - count);
        const rightPart = this.buffer.slice(cursorPos);

        this.saveHistory();

        Cursor.setPos(cursorPos - count);
        this.updateBuffer(leftPart + rightPart, false);
      }
    }
  }

  private removeSelection(): void {
    const [start, end] = Cursor.getSelectionRange();

    const leftPart = this.buffer.slice(0, start);
    const rightPart = this.buffer.slice(end);

    this.saveHistory();

    Cursor.setPos(start);
    this.updateBuffer(leftPart + rightPart);
  }

  private saveHistory(): void {
    if(this.buffer.length) {
      this.history.save(this.buffer, Cursor.getPos());
    }
  }

  private setupKeydownListener(): void {
    this.container.addEventListener("keydown", (e) => {
      if(isSpecialAction(e)) return;
      e.preventDefault();

      // DEBUG SHORTCUTS
      if(DEBUG && e.ctrlKey) {
        if(e.key === "a") {
          let text: string[] = [""];

          for(const c of this.buffer) {
            const i = text.length - 1;
            if(c === "\n") {
              text.push("\n");
            } else {
              text[i] += c;
            }
          }

          console.table(text);
          return;
        } else if(e.key === "f") {
          this.updateBuffer("**Hello**\n[World](#)\n![Image](https://images7.alphacoders.com/130/thumb-1920-1300165.jpg)\n# Yeah!");
          return;
        }
      }

      if(e.ctrlKey && e.key.toLowerCase() === "z") {
        if(e.shiftKey) {
          // redo
          if(this.history.redo()) {
            const { buffer, cursorPos} = this.history.get();
            this.buffer = buffer;
            Cursor.setPos(cursorPos);
          }
        } else {
          // undo
          if(this.bufferUpdated) {
            this.bufferUpdated = false;
            this.saveHistory();
          }

          if(this.history.undo()) {
            const { buffer, cursorPos} = this.history.get();
            this.buffer = buffer;
            Cursor.setPos(cursorPos);
          }
        }

        this.updateTree();
        return;
      }

      switch(e.key) {
        case "ArrowLeft": 
          Cursor.goLeft();
          break;
        case "ArrowRight":
          Cursor.goRight();
          break;
        case "ArrowDown":
          Cursor.goDown();
          break;
        case "ArrowUp":
          Cursor.goUp();
          break;
        case "Backspace":
          if(Cursor.isCollapsed()) {
            if(e.ctrlKey) {
              this.removeSequenceOfChars();
            } else {
              this.removeCharacter();
            }
          } else {
            this.removeSelection();
          }
          break;
        case "Enter":
          this.saveHistory();
          this.addCharacter("\n");
          break;
        case "Tab":
          this.addCharacter("\t");
          break;
        default:
          this.addCharacter(e.key);
          break;
      }
    });
  }

  private updateCursorPos(selection: Selection): void {
    const selNode = selection.focusNode;

    if(!selNode || !this.tree) return;

    let newCursorPos = Cursor.getPos();
    const offset = selection.focusOffset;
    newCursorPos = this.tree.getCursorPos(selNode, offset) || newCursorPos;
    Cursor.setPos(newCursorPos);
  }

  private setupMouseEvents(): void {
    Cursor.addCallback(() => this.updateCursor());

    window.addEventListener("mouseup", e => {
      const selection = window.getSelection();

      if(!this.tree || !selection) return;

      let newCursorPos = Cursor.getPos();

      const target = e.target as HTMLElement;
      if(selection.isCollapsed) {
        if(target.tagName === "IMG" && target.parentNode) {
          newCursorPos = this.tree.getCursorPos(target.parentNode, 0) || newCursorPos;
          Cursor.setPos(newCursorPos);
        } else {
          this.updateCursorPos(selection);
        }
      }
    });
  }

  private setupSpecialEvents(): void {
    this.container.addEventListener("paste", e => {
      e.preventDefault();
      const cursorPos = Cursor.getPos();
      const pastedText = e.clipboardData?.getData("text/plain") || "";
      const leftPart = this.buffer.slice(0, cursorPos);
      const rightPart = this.buffer.slice(cursorPos);

      this.saveHistory();

      Cursor.setPos(cursorPos + pastedText.length);
      this.updateBuffer(leftPart + pastedText + rightPart);
    });

    this.container.addEventListener("copy", e => {
      e.preventDefault();
      if(!Cursor.isCollapsed()) {
        const [start, end] = Cursor.getSelectionRange();
        const text = this.buffer.slice(start, end);
        e.clipboardData?.setData("text/plain", text);
      }
    });

    document.addEventListener("selectionchange", () => {
      const selection = window.getSelection();

      if(!this.tree || !selection) return;

      if(selection.isCollapsed && !this.wasCursorCollapsed) {
        // When clicking above selected text, the event "mouseup" is called and its callback makes use of "isCollapsed" from the window selection
        // It seems that the selection is not updated before "mouseup" is fired, making "isCollapsed" false.
        // This code calls the function when "isCollapsed" changes from false to true.
        this.wasCursorCollapsed = true;
        this.updateCursorPos(selection);
      } else if(!selection.isCollapsed) {
        this.wasCursorCollapsed = false;

        const startNode = selection.anchorNode;
        const startOffset = selection.anchorOffset;
        const endNode = selection.focusNode;
        const endOffset = selection.focusOffset;

        let startPos: number | undefined;
        if(startNode) {
          startPos = this.tree.getCursorPos(startNode, startOffset);
        }

        let endPos: number | undefined;
        if(endNode) {
          endPos = this.tree.getCursorPos(endNode, endOffset);
        }

        if(startPos !== undefined && endPos !== undefined) {
          // the selection in the browser can be made backwards
          if(startPos > endPos) {
            Cursor.setSelectionRange(endPos, startPos);
          } else {
            Cursor.setSelectionRange(startPos, endPos);
          }
        }
      }
    });
  }
}

const editorContainer = document.getElementById("editor") as HTMLDivElement;

editorContainer.focus();

const editor = new Editor(editorContainer);
(window as any).editor = editor;
