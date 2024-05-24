import Tree from "./tree";
import parser from "./parser";

import "./styles.css";

const DEBUG = true;

class Editor {
  private container: HTMLDivElement;
  private tree: Tree | undefined;
  private content = "";
  private cursorPos = 0;

  constructor(container: HTMLDivElement) {
    this.container = container;

    this.setupKeydownListener();

    this.container.addEventListener("mousedown", () => {
      console.log(window.getSelection());
      
    });
  }

  private updateContent(newContent: string) {
    this.content = newContent;

    this.tree = parser(this.content);

    this.container.innerHTML = "";
    const htmlEl = this.tree.getHTMLPreview();
    this.container.appendChild(htmlEl);

    this.tree.updateCursor(this.cursorPos);
  }

  updateCursor(): void {
    if(!this.tree) return;

    this.tree.updateCursor(this.cursorPos);
  }

  private addCharacter(char: string): void {
    if(char.length > 1) return;
    const leftPart = this.content.slice(0, this.cursorPos);
    const rightPart = this.content.slice(this.cursorPos);

    this.cursorPos++;

    this.updateContent(leftPart + char + rightPart);
  }

  private removeCharacter(): void {
    const len = this.content.length;
    if(len > 0) {
      if(this.cursorPos > 0) {
        const leftPart = this.content.slice(0, this.cursorPos - 1);
        const rightPart = this.content.slice(this.cursorPos);

        this.cursorPos--;

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
        } else if(e.key === "f") {
          this.updateContent("Hello **Jhon**!");
        }

        return;
      }

      switch(e.key) {
        case "ArrowLeft":
          if(this.cursorPos >= 1) {
            this.cursorPos--;
            this.updateCursor();
          }
          break;
        case "ArrowRight":
          if(this.cursorPos < this.content.length) {
            this.cursorPos++;
            this.updateCursor();
          }
          break;
        case "Backspace":
          this.removeCharacter();
          break;
        default:
          this.addCharacter(e.key);
          break;
      }
    });
  }
}

const editorContainer = document.getElementById("editor") as HTMLDivElement;

editorContainer.focus();

const editor = new Editor(editorContainer);
(window as any).editor = editor;
