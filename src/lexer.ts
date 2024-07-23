import { Token, Types } from "./tokens";

const HEADER_MAX_LEVEL = 6;

export default class Lexer {
  private buffer: string;
  private bufferCursor = 0;

  private curLine = 0;
  private curCol = 0;

  constructor(buffer: string) {
    this.buffer = buffer;
  }

  private isBufferEnd(): boolean {
    return this.bufferCursor >= this.buffer.length;
  }

  private advance(n = 1): void {
    this.curCol += n;
    this.bufferCursor += n;
  }

  private rewind(): void {
    this.curCol--;
    this.bufferCursor--;
  }

  private advanceWithChar(): string {
    this.curCol++;
    return this.buffer.charAt(this.bufferCursor++);
  }

  private peekChar(offset = 0): string {
    if(this.bufferCursor + offset >= this.buffer.length) return "\0";
    return this.buffer.charAt(this.bufferCursor + offset);
  }

  private match(char: string): boolean {
    return this.peekChar() === char;
  }

  private advanceIfMatch(char: string): boolean {
    const bool = this.peekChar() === char;
    if(bool) this.advance();
    return bool;
  }

  private advanceInlineUntil(cond: (c: string) => boolean): void {
    let c = "";
    while(!this.isBufferEnd() && !this.match("\n") && cond(c = this.advanceWithChar()));
  }

  private processCode(startCol: number, tokens: Token[]): void {
    let content = "";
    let wasClosed = false;

    this.advanceInlineUntil(c => {
      if(c === "`") {
        wasClosed = true;
        return false;
      }

      content += c;

      return true;
    });

    tokens.push({
      type: Types.Code,
      range: {
        start: { line: this.curLine, col: startCol },
        end: { line: this.curLine, col: this.curCol },
      },
      content,
      wasClosed,
    });
  }

  private processBold(startCol: number, tokens: Token[]): void {
    let wasClosed = false;
    const inlineTokens = this.inlineTokens((c, nextC) => {
      const isBold = c === "*" && nextC === "*";
      if(isBold) wasClosed = true;
      return !isBold;
    });

    // skip the last "*" since inlineTokens only consumes the first one
    this.advanceIfMatch("*");

    tokens.push({
      type: Types.Bold,
      range: {
        start: { line: this.curLine, col: startCol },
        end: { line: this.curLine, col: this.curCol },
      },
      tokens: inlineTokens,
      wasClosed,
    });
  }

  private processItalic(startCol: number, tokens: Token[]): void {
    let wasClosed = false;
    const inlineTokens = this.inlineTokens(c => {
      const isItalic = c === "*";
      if(isItalic) wasClosed = true;
      return !isItalic;
    });

    tokens.push({
      type: Types.Italic,
      range: {
        start: { line: this.curLine, col: startCol },
        end: { line: this.curLine, col: this.curCol },
      },
      tokens: inlineTokens,
      wasClosed,
    });
  }

  private processText(c: string, line: number, startCol: number, tokens: Token[]): void {
    const prevToken = tokens[tokens.length - 1];

    if(prevToken && prevToken.type === Types.Text) {
      prevToken.range.end.col = startCol + 1;
      prevToken.text += c;
    } else {
      tokens.push({
        type: Types.Text,
        text: c,
        range: {
          start: { line, col: startCol },
          end: { line, col: startCol + 1 },
        },
      });
    }
  }

  private processHeader(tokens: Token[]): boolean {
    let level = 0;

    while(this.peekChar(level) === "#") {
      level++;
    }

    const finalC = this.peekChar(level);
    if((finalC === " " || finalC === "\0") && level < HEADER_MAX_LEVEL) {
      // skip all the "#" and the space or "\0" characters
      this.advance(level + 1);
      const inlineTokens = this.inlineTokens();

      tokens.push({
        type: Types.Header,
        range: {
          start: { line: this.curLine, col: 0 },
          end: { line: this.curLine, col: this.curCol },
        },
        tokens: inlineTokens,
        level: level + 1,
        hasAfterSpace: finalC === " ",
      });

      return true;
    } else {
      return false;
    }
  }

  private processParagraph(tokens: Token[]): void {
    this.rewind();
    const inlineTokens = this.inlineTokens();
    tokens.push({
      type: Types.Paragraph,
      range: {
        start: { line: this.curLine, col: 0 },
        end: { line: this.curLine, col: this.curCol },
      },
      tokens: inlineTokens,
    });
  }

  private processLink(startCol: number, tokens: Token[]): void {
    let text = "", raw = "[", dest = "";
    let wasClosed = false;

    this.advanceInlineUntil(c => {
      raw += c;

      if(c === "]") {
        return false;
      } else {
        text += c;
        return true;
      }
    });

    if(this.advanceIfMatch("(")) {
      raw += "(";

      this.advanceInlineUntil(c => {
        raw += c;

        if(c === ")") {
          wasClosed = true;
          return false;
        } else {
          dest += c;
          return true;
        }
      });
    }

    tokens.push({
      type: Types.Link,
      range: {
        start: { line: this.curLine, col: startCol },
        end: { line: this.curLine, col: this.curCol },
      },
      text,
      dest: dest.length > 0 ? dest : null,
      raw,
      wasClosed,
    });
  }

  private processImage(startCol: number, tokens: Token[]): void {
    let altText = "", url = "", raw = "![";
    let wasClosed = false;

    this.advanceInlineUntil(c => {
      raw += c;

      if(c === "]") {
        return false;
      } else {
        altText += c;
        return true;
      }
    });

    if(this.advanceIfMatch("(")) {
      raw += "(";

      this.advanceInlineUntil(c => {
        raw += c;
        if(c === ")") {
          wasClosed = true;
          return false;
        } else {
          url += c;
          return true;
        }
      });
    }

    tokens.push({
      type: Types.Image,
      range: {
        start: { line: this.curLine, col: startCol },
        end: { line: this.curLine, col: this.curCol },
      },
      altText,
      url: url.length > 0 ? url : null,
      raw,
      wasClosed,
    });
  }

  private processRule(firstChar: string, startCol: number, tokens: Token[]): boolean {
    let peekCursor = 0;
    let repeatedChars = 1;
    let rawText = firstChar;
    let nextC = this.peekChar();

    while(nextC === firstChar || nextC === " ") {
      if(nextC === firstChar) repeatedChars++;
      rawText += nextC;
      nextC = this.peekChar(++peekCursor);
    }

    if(repeatedChars >= 3 && (nextC === "\n" || nextC === "\0")) {
      this.advance(peekCursor);

      tokens.push({
        type: Types.Rule,
        range: {
          start: { line: this.curLine, col: startCol },
          end: { line: this.curLine, col: this.curCol },
        },
        raw: rawText,
      });

      return true;
    }

    return false;
  }

  private inlineTokens(predicate?: (c: string, nextC: string) => boolean): Token[] {
    const tokens: Token[] = [];

    while(!this.isBufferEnd() && !this.match("\n")) {
      const startCol = this.curCol;

      const c = this.advanceWithChar();
      const nextC = this.peekChar();

      if(predicate && !predicate(c, nextC)) break;

      switch(c) {
        case "`": {
          this.processCode(startCol, tokens);
        } break;
        case "*": {
          if(this.advanceIfMatch("*")) {
            this.processBold(startCol, tokens);
          } else {
            this.processItalic(startCol, tokens);
          }
        } break;
        case "[": {
          this.processLink(startCol, tokens);
        } break;
        case "!": {
          if(this.advanceIfMatch("[")) {
            this.processImage(startCol, tokens);
          } else {
            this.processText(c, this.curLine, startCol, tokens);
          }
        } break;
        default: {
          this.processText(c, this.curLine, startCol, tokens);
        }
      }
    }

    return tokens;
  }

  private blockTokens(): Token[] {
    const tokens: Token[] = [];

    while(!this.isBufferEnd()) {
      const startCol = this.curCol;
      const c = this.advanceWithChar();

      switch(c) {
        case "#": {
          if(!this.processHeader(tokens)) {
            this.processParagraph(tokens);
          }
        } break;
        case "\n": {
          tokens.push({
            type: Types.NewLine,
            range: {
              start: { line: this.curLine, col: startCol },
              end: { line: this.curLine, col: startCol + 1 },
            },
          });
          this.curLine++;
          this.curCol = 0;
        } break;
        case "_":
        case "-":
        case "*": {
          if(!this.processRule(c, startCol, tokens)) {
            this.processParagraph(tokens);
          }
        } break;
        default: this.processParagraph(tokens);
      }
    }

    return tokens;
  }

  scanTokens(): Token[] {
    const tokens = this.blockTokens();
    return tokens;
  }
}
