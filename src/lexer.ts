import { Types, Token, NUMBER_OF_HEADERS, BEGIN_HEADER_TYPE_LIST } from "./types";
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

  private processCloseBlock(blockType: Types, value: string): Token {
    const startPos = this.bufferCursor;

    this.advance(value.length);
    this.parentQueue.deleteLastItem();

    return { type: blockType, value, startPos };
  }

  private processBlockType(beginBlockType: Types, endBlockType: Types, value: string): Token {
    if(this.parentQueue.getLastItem() === beginBlockType) {
      return this.processCloseBlock(endBlockType, value);
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

    // Line Break
    if(c === "\n") {
      this.parentQueue.clear();

      const startPos = this.bufferCursor;

      return {
        type: Types.NewLine,
        value: this.getCharAndAdvance(),
        startPos,
      }
    }
 
    switch(this.parentQueue.getLastItem()) {
      case Types.BeginInlineCode: 
        if(c === "`") {
          return this.processCloseBlock(Types.EndInlineCode, "`");
        } else {
          return this.processChar();
        }
      case Types.BeginLinkText:
        if(c === "]") {
          const token = this.processCloseBlock(Types.EndLinkText, "]");

          // processCloseBlock advances the bufferCursor
          if(this.getCurrentChar() !== "(") {
            // deletes Types.BeginLink when the next character doesn't follow the link syntax
            this.parentQueue.deleteLastItem();
          }
          
          return token;
        } else {
          return this.processChar();
        }
      case Types.BeginLinkDest:
        if(c === ")") {
          const token = this.processCloseBlock(Types.EndLinkDest, ")");
          // deletes Types.BeginLink from the queue
          this.parentQueue.deleteLastItem();
          return token;
        } else {
          return this.processChar();
        }
    }

    // OPEN INLINE CODE BLOCK (`code`)
    if(c === "`") {
      return this.processOpenBlock(Types.BeginInlineCode, "`");
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

    // HEADERS
    if(c === "#" && (p_c === "" || p_c === "\n")) {
      let count = 1;

      while(this.getNextChar(count) === "#") {
        count++;
      }

      if(count <= NUMBER_OF_HEADERS && this.getNextChar(count) === " ") {
        const hashes = "".padStart(count, "#");
        const value = hashes + " ";

        return this.processOpenBlock(BEGIN_HEADER_TYPE_LIST[count - 1], value);
      }
    }

    // LINK
    if(c === "[") {
      this.parentQueue.addItem(Types.BeginLink);
      return this.processOpenBlock(Types.BeginLinkText, "[");
    }

    if(c === "(" && this.parentQueue.getLastItem() === Types.BeginLink) {
      return this.processOpenBlock(Types.BeginLinkDest, "(");
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

  peekNextToken(offset = 0): Token | undefined {
    return this.tokens[this.tokenCursor + offset];
  }

  foreachTokenWhile(predicate: (token: Token) => boolean): void {
    let token = this.tokens[this.tokenCursor];

    while(token && predicate(token)) {
      this.tokenCursor++;
      token = this.tokens[this.tokenCursor];
    }
  }
}
