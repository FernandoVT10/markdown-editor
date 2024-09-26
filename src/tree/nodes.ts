import MDNode from "./MDNode";
import Subtree from "./traits/Subtree";
import SelectableText from "./traits/SelectableText";
import SyntaxSymbol from "./traits/SyntaxSymbol";
import RawContent from "./traits/RawContent";
import RawMarkdown from "./traits/RawMarkdown";
import SelectableNewLine from "./traits/SelectableNewLine";
import ListMark from "./traits/ListMark";

import { TagName } from "./MDNode";
import { Token, TokenRange, Tokens } from "../tokens";

export class Text extends MDNode {
  constructor(text: string, range: TokenRange) {
    super(range, "span");

    this.htmlEl.textContent = text;

    this.addTrait(new SelectableText());
  }

  onTokenUpdate(token: Tokens.Text): void {
    this.htmlEl.textContent = token.text;
  }

  updateText(text: string): void {
    this.htmlEl.textContent = text;
  }
}

export class Paragraph extends MDNode {
  constructor(range: TokenRange, nodes: MDNode[]) {
    super(range, "p");

    this.addTrait(new Subtree(nodes, this.htmlEl));
  }

  // paragraph doesn't need to update anything
  onTokenUpdate(_: Token): void {}
}

export class Italic extends MDNode {
  constructor(token: Tokens.Italic, nodes: MDNode[]) {
    super(token.range, "i");
    this.addTrait(new Subtree(nodes, this.htmlEl));

    this.addTrait(new SyntaxSymbol("*", this.getRange(), this.htmlEl, {
      addSymbolAtEnd: token.wasClosed,
      neverHide: !token.wasClosed,
    }));
  }

  public onTokenUpdate(token: Tokens.Italic): void {
    this.getTrait<SyntaxSymbol>(SyntaxSymbol).updateOpts({
      addSymbolAtEnd: token.wasClosed,
      neverHide: !token.wasClosed,
    });
  }
}

export class Bold extends MDNode {
  constructor(token: Tokens.Bold, nodes: MDNode[]) {
    super(token.range, "strong");

    this.addTrait(new Subtree(nodes, this.htmlEl));
    this.addTrait(new SyntaxSymbol("**", this.getRange(), this.htmlEl, {
      addSymbolAtEnd: token.wasClosed,
      neverHide: !token.wasClosed,
    }));
  }

  public onTokenUpdate(token: Tokens.Bold): void {
    this.getTrait<SyntaxSymbol>(SyntaxSymbol).updateOpts({
      addSymbolAtEnd: token.wasClosed,
      neverHide: !token.wasClosed,
    });
  }
}

export class NewLine extends MDNode {
  constructor(token: Tokens.NewLine) {
    super(token.range, "div");

    const br = document.createElement("br");
    this.htmlEl.appendChild(br);

    this.addTrait(new SelectableNewLine());
  }

  public onTokenUpdate(_: Token): void {}
}

export class Code extends MDNode {
  constructor(token: Tokens.Code) {
    const { range, wasClosed } = token;

    super(range, "code");

    this.addTrait(new RawContent(token, this.htmlEl));

    this.addTrait(new SyntaxSymbol("`", this.getRange(), this.htmlEl, {
      addSymbolAtEnd: wasClosed,
      neverHide: !wasClosed,
    }));
  }

  public onTokenUpdate(token: Tokens.Code): void {
    this.getTrait<SyntaxSymbol>(SyntaxSymbol).updateOpts({
      addSymbolAtEnd: token.wasClosed,
      neverHide: !token.wasClosed,
    });

    this.getTrait<RawContent>(RawContent).updateData(
      token.content, token.wasClosed
    );
  }
}

export class Header extends MDNode {
  static getTagName(level: number): TagName {
    return `h${level}` as TagName;
  }

  private contentContainer: HTMLDivElement;

  constructor(token: Tokens.Header, nodes: MDNode[]) {
    const { level } = token;
    super(token.range, Header.getTagName(level));

    this.contentContainer = document.createElement("div");
    this.htmlEl.appendChild(this.contentContainer);

    this.addTrait(new Subtree(nodes, this.contentContainer));

    this.addTrait(new SyntaxSymbol(this.getSymbol(token), this.getRange(), this.contentContainer, {
      addSymbolAtEnd: false,
      neverHide: false,
    }));
  }

  private getSymbol(token: Tokens.Header): string {
    let symbol = "".padStart(token.level, "#");
    if(token.hasAfterSpace) {
      symbol += " ";
    }
    return symbol;
  }

  public onTokenUpdate(token: Tokens.Header): void {
    // here we create another header element with the updated header level
    const newHeaderEl = document.createElement(Header.getTagName(token.level));

    // then we replace the old header with the new one
    this.htmlEl.replaceWith(newHeaderEl);
    this.htmlEl = newHeaderEl;

    // and finally we need to append the element that contains everything to the new replaced header
    this.htmlEl.appendChild(this.contentContainer);

    this.getTrait<SyntaxSymbol>(SyntaxSymbol).updateSymbol(this.getSymbol(token));
  }
}

export class Link extends MDNode {
  private linkEl: HTMLAnchorElement;

  constructor(token: Tokens.Link) {
    super(token.range, "span");

    this.linkEl = document.createElement("a");
    this.linkEl.innerText = token.text;
    this.linkEl.href = token.dest || "";

    const customGetCursorPos = (selNode: Node, offset: number) => {
      if(this.linkEl.firstChild?.isSameNode(selNode)) {
        // here we sum one to ignore the first "["
        return {
          col: this.getStartCol() + offset + 1,
          line: this.getStartLine(),
        };
      }
    };

    this.addTrait(new RawMarkdown({
      rawMarkdown: token.raw,
      previewHtmlEl: this.linkEl,
      range: this.getRange(),
      parentEl: this.htmlEl,
      customGetCursorPos,
      opts: { neverHide: !token.wasClosed },
    }));
  }

  public onTokenUpdate(token: Tokens.Link): void {
    this.linkEl.innerText = token.text;
    this.linkEl.href = token.dest || "";

    const rawMarkdown = this.getTrait<RawMarkdown>(RawMarkdown);
    rawMarkdown.updateRawMarkdown(token.raw);
    rawMarkdown.updateOpts({ neverHide: !token.wasClosed });
  }
}

export class MDImage extends MDNode {
  private imgEl: HTMLImageElement;

  constructor(token: Tokens.Image) {
    super(token.range, "span");

    this.imgEl = document.createElement("img");
    this.imgEl.alt = token.altText;
    this.imgEl.src = token.url || "";

    const imgContainer = document.createElement("div");
    imgContainer.appendChild(this.imgEl);

    const customGetCursorPos = (selNode: Node, _: number) => {
      if(imgContainer.isSameNode(selNode)) {
        return {
          col: this.getEndCol(),
          line: this.getStartLine(),
        };
      }
    };

    this.addTrait(new RawMarkdown({
      rawMarkdown: token.raw,
      previewHtmlEl: imgContainer,
      range: this.getRange(),
      parentEl: this.htmlEl,
      customGetCursorPos,
      opts: { neverHide: !token.wasClosed },
    }));
  }

  public onTokenUpdate(token: Tokens.Image): void {
    this.imgEl.alt = token.altText;
    this.imgEl.src = token.url || "";

    const rawMarkdown = this.getTrait<RawMarkdown>(RawMarkdown);
    rawMarkdown.updateRawMarkdown(token.raw);
    rawMarkdown.updateOpts({ neverHide: !token.wasClosed });
  }
}

export class Rule extends MDNode {
  constructor(token: Tokens.Rule) {
    super(token.range, "div");

    const hrEl = document.createElement("hr");

    const customGetCursorPos = (selNode: Node, _: number) => {
      if(this.htmlEl.isSameNode(selNode) || hrEl.isSameNode(selNode)) {
        return {
          col: this.getEndCol(),
          line: this.getStartLine(),
        };
      }
    };

    this.addTrait(new RawMarkdown({
      rawMarkdown: token.raw,
      previewHtmlEl: hrEl,
      range: this.getRange(),
      parentEl: this.htmlEl,
      customGetCursorPos,
      opts: { neverHide: false },
    }));
  }

  public onTokenUpdate(token: Tokens.Rule): void {
    const rawMarkdown = this.getTrait<RawMarkdown>(RawMarkdown);
    rawMarkdown.updateRawMarkdown(token.raw);
  }
}

export class Blockquote extends MDNode {
  private contentContainer: HTMLDivElement;

  constructor(token: Tokens.Blockquote, nodes: MDNode[]) {
    super(token.range, "blockquote");

    this.contentContainer = document.createElement("div");
    this.addTrait(new Subtree(nodes, this.contentContainer));

    const symbol = this.getSymbol(token.nestedLevel);
    this.addTrait(new SyntaxSymbol(symbol, this.getRange(), this.contentContainer, {
      neverHide: false,
      addSymbolAtEnd: false,
    }));

    this.setNestedQuotes(token.nestedLevel);
  }
  
  private getSymbol(nestedLevel: number): string {
    return "".padStart(nestedLevel + 1, ">");
  }

  private setNestedQuotes(nestedLevel: number): void {
    this.htmlEl.innerHTML = "";
    let prevEl = this.htmlEl;

    for(let i = 0; i < nestedLevel; i++) {
      const blockquote = document.createElement("blockquote");
      prevEl.append(blockquote);
      prevEl = blockquote;
    }

    prevEl.appendChild(this.contentContainer);
  }

  public onTokenUpdate(token: Tokens.Blockquote): void {
    const symbol = this.getSymbol(token.nestedLevel);
    this.getTrait<SyntaxSymbol>(SyntaxSymbol).updateSymbol(symbol);
    this.setNestedQuotes(token.nestedLevel);
  }
}

export class ListItem extends MDNode {
  // private markerNode: Text;

  constructor(token: Tokens.ListItem, nodes: MDNode[]) {
    super(token.range, "li");

    this.addTrait(new Subtree(nodes, this.htmlEl));

    this.addTrait(new ListMark(token.marker, this.getRange(), this.htmlEl));
  }

  public onTokenUpdate(token: Token): void {
  }
}

export class List extends MDNode {
  constructor(token: Tokens.List, nodes: MDNode[]) {
    super(token.range, "ul");

    this.addTrait(new Subtree(nodes, this.htmlEl));
  }

  public onTokenUpdate(token: Token): void {
  }
}
