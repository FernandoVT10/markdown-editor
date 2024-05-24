import { Types, Token } from "./types";
import { Queue } from "./utils";

export class Lexer {
  private buffer: string;
  private bufferCursor = 0;

  private tokens: Token[] = [];
  private tokenCursor = 0;

  private parentQueue = new Queue<Types>;

  constructor(buffer: string) {
    this.buffer = buffer;
  }

  private advance(n = 1) {
    this.bufferCursor += n;
  }

  private getCharAndAdvance(): string {
    const c =  this.getCurrentChar();
    this.advance();
    return c;
  }

  private getCurrentChar(): string {
    return this.buffer.charAt(this.bufferCursor);
  }

  private getPreviousChar(): string {
    return this.buffer.charAt(this.bufferCursor - 1);
  }

  private getNextChar(offset = 0): string {
    return this.buffer.charAt(this.bufferCursor + offset);
  }

  private processOpenBlock(blockType: Types, value: string): Token {
    const startPos = this.bufferCursor;

    this.advance(value.length);
    this.parentQueue.addItem(blockType);

    return { type: blockType, value, startPos };
  }

  private processBlockType(beginBlockType: Types, endBlockType: Types, value: string): Token {
    if(this.parentQueue.getLastItem() === beginBlockType) {
      const startPos = this.bufferCursor;

      this.advance(value.length);
      this.parentQueue.deleteLastItem();

      return { type: endBlockType, value, startPos };
    } else {
      return this.processOpenBlock(beginBlockType, value);
    }
  }

  private processChar(): Token {
    const startPos = this.bufferCursor;
    return {
      type: Types.Text,
      value: this.getCharAndAdvance(),
      startPos,
    };
  }

  private consumeNextToken(): Token | undefined {
    const c = this.getCurrentChar();

    if(!c) return undefined;

    // INLINE CODE BLOCK (`code`)
    if(c === "`") {
      return this.processBlockType(Types.BeginInlineCode, Types.EndInlineCode, "`");
    } else if(this.parentQueue.getLastItem() === Types.BeginInlineCode) {
      return this.processChar();
    }

    // BOLD & ITALIC (** and *)
    if(c === "*") {
      if(this.getNextChar(1) === "*") {
        // BOLD
        return this.processBlockType(Types.BeginBoldText, Types.EndBoldText, "**");
      } else {
        // ITALIC
        return this.processBlockType(Types.BeginItalicText, Types.EndItalicText, "*");
      }
    }

    const p_c = this.getPreviousChar();

    // HEADER 1
    if(c === "#" && this.getNextChar(1) === " " && (p_c === "" || p_c === "\n")) {
      return this.processOpenBlock(Types.BeginH1, "# ");
    }

    return this.processChar();
  }

  processTokens(): void {
    let token: Token | undefined;

    while((token = this.consumeNextToken()) !== undefined) {
      this.tokens.push(token);
    }
  }

  getNextToken(): Token | undefined {
    const token = this.tokens[this.tokenCursor];
    this.tokenCursor++;
    return token;
  }

  foreachTokenWhile(predicate: (token: Token) => boolean): void {
    let token = this.tokens[this.tokenCursor];

    while(token && predicate(token)) {
      this.tokenCursor++;
      token = this.tokens[this.tokenCursor];
    }
  }
}
