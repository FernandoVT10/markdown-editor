import Tree from "./tree";
import Cursor from "./cursor";
import parser from "./parser";
import { isalnum } from "./utils";

import "./styles.css";

const DEBUG = true;

function logInfo(text: string) {
  const style = "color: #79aaeb;font-weight: bold;";
  console.log("%c" + text, style);
}

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
          console.log("Current content:", this.content.replace("\n", "\\n"));
          return;
        } else if(e.key === "f") {
          this.updateContent("**Hello**\nWorld\n![Image](https://images7.alphacoders.com/130/thumb-1920-1300165.jpg)\n# Yeah!");
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
          if(e.ctrlKey) {
            this.removeSequenceOfChars();
          } else {
            this.removeCharacter();
          }
          break;
        case "Enter":
          this.addCharacter("\n");
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

      if(node) {
        // this.tree.updateCursorPos(node, offset);
      }
    });
  }
}

const editorContainer = document.getElementById("editor") as HTMLDivElement;

editorContainer.focus();

const editor = new Editor(editorContainer);
(window as any).editor = editor;
