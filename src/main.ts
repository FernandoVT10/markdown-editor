import Tree from "./tree";
import Cursor from "./cursor";
import parser from "./parser";
import { isalnum } from "./utils";

import "./styles.css";

const DEBUG = true;

class Editor {
  private container: HTMLDivElement;
  private tree: Tree | undefined;
  private content = "";

  constructor(container: HTMLDivElement) {
    this.container = container;

    this.setupKeydownListener();

    this.setupMouseEvents();
  }

  private updateCursor(): void {
    if(!this.tree) return;

    this.tree.updateCursor(Cursor.getPos());
  }

  private updateContent(newContent: string) {
    this.content = newContent;

    this.tree = parser(this.content);

    this.container.innerHTML = "";
    const htmlEl = this.tree.getHTMLPreview();
    this.container.appendChild(htmlEl);

    this.updateCursor();
  }

  private addCharacter(char: string): void {
    if(char.length > 1) return;
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

  private setupKeydownListener(): void {
    this.container.addEventListener("keydown", (e) => {
      e.preventDefault();

      // DEBUG SHORTCUTS
      if(DEBUG && e.ctrlKey) {
        if(e.key === "c") {
          console.log("Current content:", this.content);
          return;
        } else if(e.key === "f") {
          this.updateContent("[Hello](https://fvtblog.com)");
          return;
        }
      }

      const cursorPos = Cursor.getPos();

      switch(e.key) {
        case "ArrowLeft":
          if(cursorPos >= 1) {
            Cursor.setPos(cursorPos - 1);
          }
          break;
        case "ArrowRight":
          if(cursorPos < this.content.length) {
            Cursor.setPos(cursorPos + 1);
          }
          break;
        case "Backspace":
          if(e.ctrlKey) {
            this.removeSequenceOfChars();
          } else {

            this.removeCharacter();
          }
          break;
        case "Enter":
          Cursor.setPos(Cursor.getPos() + 1);
          this.updateContent(this.content + "\n");
          break;
        default:
          this.addCharacter(e.key);
          break;
      }
    });
  }

  private setupMouseEvents(): void {
    Cursor.onUpdate(() => {
      this.updateCursor();
    });

    this.container.addEventListener("mouseup", () => {
      const selection = window.getSelection();

      if(!this.tree || !selection) return;

      const node = selection.focusNode;
      const offset = selection.focusOffset;

      if(!node || node.nodeType !== Node.TEXT_NODE) return;

      this.tree.updateCursorPos(node, offset);
    });
  }
}

const editorContainer = document.getElementById("editor") as HTMLDivElement;

editorContainer.focus();

const editor = new Editor(editorContainer);
(window as any).editor = editor;
