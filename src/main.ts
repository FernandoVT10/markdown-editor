import Tree from "./tree";
import Cursor from "./cursor";
import parser from "./parser";
import { isalnum, isSpecialAction } from "./utils";
import { DEBUG, logInfo } from "./debug";

import "./styles.css";

class Editor {
  private container: HTMLDivElement;
  private tree: Tree | undefined;
  private content = "";

  constructor(container: HTMLDivElement) {
    this.container = container;
    this.setupKeydownListener();
    this.setupMouseEvents();
    this.setupSpecialEvents();
  }

  private updateCursor(): void {
    if(this.tree) this.tree.onCursorUpdate();
  }

  private updateContent(newContent: string) {
    this.content = newContent;
    Cursor.updateLines(newContent);

    logInfo("Starting to parse...");
    const t = Date.now();

    this.tree = parser(this.content);

    const ms = Date.now() - t;
    logInfo(`Parsing took: ${ms}ms`);

    this.tree.render(this.container);

    this.updateCursor();
  }

  private addCharacter(char: string): void {
    if(char.length > 1) return;

    if(!Cursor.isCollapsed()) this.removeSelection();

    const cursorPos = Cursor.getPos();
    const leftPart = this.content.slice(0, cursorPos);
    const rightPart = this.content.slice(cursorPos);

    Cursor.setPos(cursorPos + 1);

    this.updateContent(leftPart + char + rightPart);
  }

  private removeCharacter(): void {
    const len = this.content.length;
    if(len > 0) {
      const cursorPos = Cursor.getPos();

      if(cursorPos > 0) {
        const leftPart = this.content.slice(0, cursorPos - 1);
        const rightPart = this.content.slice(cursorPos);

        Cursor.setPos(cursorPos - 1);

        this.updateContent(leftPart + rightPart);
      }
    }
  }

  private removeSequenceOfChars(): void {
    const len = this.content.length;
    if(len > 0) {
      const cursorPos = Cursor.getPos();

      if(!isalnum(this.content.charAt(cursorPos - 1))) {
        return this.removeCharacter();
      }

      if(cursorPos > 0) {
        let count = 1;

        while(isalnum(this.content.charAt(cursorPos - 1 - count)) && cursorPos - count > 0) {
          count++;
        }

        const leftPart = this.content.slice(0, cursorPos - count);
        const rightPart = this.content.slice(cursorPos);

        Cursor.setPos(cursorPos - count);

        this.updateContent(leftPart + rightPart);
      }
    }
  }

  private removeSelection(): void {
    const [start, end] = Cursor.getSelectionRange();

    const leftPart = this.content.slice(0, start);
    const rightPart = this.content.slice(end);

    Cursor.setPos(start);
    this.updateContent(leftPart + rightPart);
  }

  private setupKeydownListener(): void {
    this.container.addEventListener("keydown", (e) => {
      if(isSpecialAction(e)) return;
      e.preventDefault();

      // DEBUG SHORTCUTS
      if(DEBUG && e.ctrlKey) {
        if(e.key === "a") {
          console.log("Current content:", this.content.replace("\n", "\\n"));
          return;
        } else if(e.key === "f") {
          this.updateContent("**Hello**\n[World](#)\n![Image](https://images7.alphacoders.com/130/thumb-1920-1300165.jpg)\n# Yeah!");
          return;
        }
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

  private setupMouseEvents(): void {
    Cursor.addCallback(() => this.updateCursor());

    window.addEventListener("click", e => {
      const selection = window.getSelection();

      if(!this.tree || !selection) return;

      let newCursorPos = Cursor.getPos();

      const target = e.target as HTMLElement;
      if(target.tagName === "IMG" && target.parentNode) {
        newCursorPos = this.tree.getCursorPos(target.parentNode, 0) || newCursorPos;
        Cursor.setPos(newCursorPos);
      } else if(selection.isCollapsed) {
        const selNode = selection.focusNode;

        if(selNode) {
          const offset = selection.focusOffset;
          newCursorPos = this.tree.getCursorPos(selNode, offset) || newCursorPos;
        }

        Cursor.setPos(newCursorPos);
      }
    });
  }

  private setupSpecialEvents(): void {
    this.container.addEventListener("paste", e => {
      e.preventDefault();
      const cursorPos = Cursor.getPos();
      const pastedText = e.clipboardData?.getData("text/plain") || "";
      const leftPart = this.content.slice(0, cursorPos);
      const rightPart = this.content.slice(cursorPos);

      Cursor.setPos(cursorPos + pastedText.length);
      this.updateContent(leftPart + pastedText + rightPart);
    });

    this.container.addEventListener("copy", e => {
      e.preventDefault();
      if(!Cursor.isCollapsed()) {
        const [start, end] = Cursor.getSelectionRange();
        const text = this.content.slice(start, end);
        e.clipboardData?.setData("text/plain", text);
      }
    });

    document.addEventListener("selectionchange", () => {
      const selection = window.getSelection();

      if(!this.tree || !selection) return;

      if(!selection.isCollapsed) {
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
