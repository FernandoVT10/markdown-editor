// @ts-nocheck
import { MDNode, MDBlockNode, TagName } from "./definitions";
import { MDRange } from "../tokens";
import { Tokens } from "../tokens";
import { MDSyntax, RawMdSyntax } from "./traits";
import Cursor, { CursorPos } from "../cursor";
import { setSelectionAtNode, scrollToEl } from "../utils";

export class Text extends MDNode {
  constructor(text: string, range: MDRange) {
    super(range, "span");

    this.htmlEl.textContent = text;
  }

  onCursorUpdate(cursor: Cursor): void {
    const posX = cursor.getPosX();

    if(this.isInCursorRange(cursor) && cursor.isCollapsed()) {
      const offset = posX - this.getStartPos();
      const node = this.htmlEl.firstChild;

      if(node) setSelectionAtNode(node, offset);
      scrollToEl(this.htmlEl);
    }
  }

  getCursorPos(selNode: Node, offset: number): CursorPos | undefined {
    if(this.htmlEl.firstChild?.isSameNode(selNode)) {
      return {
        x: this.getStartPos() + offset,
        y: this.line,
      };
    }
  }
}

export class Paragraph extends MDBlockNode {
  constructor(range: MDRange, nodes: MDNode[]) {
    super(range, nodes, "p");
  }
}

export class Italic extends MDBlockNode {
  constructor(token: Tokens.Italic, nodes: MDNode[]) {
    super(token.range, nodes, "i");
    this.addTrait(new MDSyntax({
      htmlEl: this.htmlEl,
      mdMark: "*",
      range: this.getRange(),
      closeBlock: token.wasClosed,
      keepActive: !token.wasClosed,
    }));
  }
}

export class Bold extends MDBlockNode {
  constructor(token: Tokens.Bold, nodes: MDNode[]) {
    super(token.range, nodes, "strong");
    this.addTrait(new MDSyntax({
      htmlEl: this.htmlEl,
      mdMark: "**",
      range: this.getRange(),
      closeBlock: token.wasClosed,
      keepActive: !token.wasClosed,
    }));
  }
}

export class NewLine extends MDBlockNode {
  constructor(range: MDRange) {
    super(range, [], "div");

    const br = document.createElement("br");
    this.htmlEl.appendChild(br);
  }

  onCursorUpdate(cursor: Cursor): void {
    if(this.isInCursorRange(cursor) && cursor.isCollapsed()) {
      setSelectionAtNode(this.htmlEl, 0);
      scrollToEl(this.htmlEl);
    }
  }

  getCursorPos(selNode: Node, _: number): CursorPos | undefined {
    if(this.htmlEl.isSameNode(selNode)) {
      return {
        x: this.getStartPos(),
        y: this.line,
      };
    }
  }
}

export class Code extends MDBlockNode {
  constructor(token: Tokens.Code) {
    const { range, wasClosed, content } = token;

    const nodes: MDNode[] = [];

    if(content.length > 0) {
      const textStartPos = range[0] + 1;
      const textEndPos = wasClosed ? range[1] - 1 : range[1];
      nodes.push(new Text(content, [textStartPos, textEndPos]));
    }

    super(range, nodes, "code");

    this.addTrait(new MDSyntax({
      htmlEl: this.htmlEl,
      mdMark: "`",
      range: this.getRange(),
      closeBlock: wasClosed,
      keepActive: !wasClosed,
    }));
  }
}

export class Header extends MDBlockNode {
  constructor(token: Tokens.Header, nodes: MDNode[]) {
    const { range, level } = token;
    const tagName = `h${level}` as TagName;
    super(range, nodes, tagName);

    const startPos = this.getStartPos();
    let mdMark = "".padStart(level, "#");
    let nodeEndPos = startPos + level;

    if(token.hasAfterSpace) {
      mdMark += " ";
      nodeEndPos++;
    }

    this.addTrait(new MDSyntax({
      htmlEl: this.htmlEl,
      mdMark,
      range: this.getRange(),
      closeBlock: false,
      keepActive: false,
    }));
  }
}

export class Link extends MDBlockNode {
  constructor(token: Tokens.Link) {
    super(token.range, [], "span");

    const linkEl = document.createElement("a");
    linkEl.innerText = token.text;
    if(token.dest) linkEl.href = token.dest;

    this.addTrait(new RawMdSyntax({
      containerEl: this.htmlEl,
      rawMDText: token.raw,
      range: this.getRange(),
      htmlEl: linkEl,
      keepActive: !token.wasClosed,
      getCursorPos: (selNode: Node, offset: number) => {
        if(linkEl.firstChild?.isSameNode(selNode)) {
          // here we sum one to ignore the first "["
          return {
            x: this.getStartPos() + offset + 1,
            y: this.line,
          };
        }
      },
    }));
  }
}

export class MDImage extends MDBlockNode {
  constructor(token: Tokens.Image) {
    super(token.range, [], "span");

    const imgEl = document.createElement("img");
    imgEl.alt = token.altText;
    if(token.url) imgEl.src = token.url;

    const imgContainer = document.createElement("div");
    imgContainer.appendChild(imgEl);

    this.addTrait(new RawMdSyntax({
      containerEl: this.htmlEl,
      rawMDText: token.raw,
      range: this.getRange(),
      htmlEl: imgContainer,
      keepActive: !token.wasClosed,
      getCursorPos: (selNode: Node, _: number) => {
        if(imgContainer.isSameNode(selNode)) {
          return {
            x: this.getEndPos(),
            y: this.line,
          };
        }
      },
    }));
  }
}

export class Rule extends MDBlockNode {
  constructor(token: Tokens.Rule) {
    super(token.range, [], "div");

    const hrEl = document.createElement("hr");

    this.addTrait(new RawMdSyntax({
      containerEl: this.htmlEl,
      rawMDText: token.raw,
      range: this.getRange(),
      htmlEl: hrEl,
      keepActive: false,
      getCursorPos: (selNode: Node, _: number) => {
        if(this.htmlEl.isSameNode(selNode) || hrEl.isSameNode(selNode)) {
          return {
            x: this.getEndPos(),
            y: this.line,
          };
        }
      },
    }));
  }
}

// TODO: Make the list node
// export class MDList extends MDBlockNode {
//   constructor(token: Tokens.List, nodes: MDNode[]) {
//     const { range, marker } = token;
//     super(range, nodes, "div");
//
//     this.addTrait(new MDSyntax({
//       htmlEl: this.htmlEl,
//       mdMark: marker,
//       range: this.getRange(),
//       closeBlock: false,
//       keepActive: false,
//     }));
//   }
// }
