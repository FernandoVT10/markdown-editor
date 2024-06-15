import { Token, Types } from "./tokens";

const HEADER_MAX_LEVEL = 6;

export default class Lexer {
  private buffer: string;
  private bufferCursor = 0;

  constructor(buffer: string) {
    this.buffer = buffer;
  }

  private isBufferEnd(): boolean {
    return this.bufferCursor >= this.buffer.length;
  }

  private advance(n = 1): void {
    this.bufferCursor += n;
  }

  private rewind(): void {
    this.bufferCursor--;
  }

  private advanceWithChar(): string {
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

  private processCode(startPos: number, tokens: Token[]): void {
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
      range: [startPos, this.bufferCursor],
      content,
      wasClosed,
    });
  }

  private processBold(startPos: number, tokens: Token[]): void {
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
      range: [startPos, this.bufferCursor],
      tokens: inlineTokens,
      wasClosed,
    });
  }

  private processItalic(startPos: number, tokens: Token[]): void {
    let wasClosed = false;
    const inlineTokens = this.inlineTokens(c => {
      const isItalic = c === "*";
      if(isItalic) wasClosed = true;
      return !isItalic;
    });

    tokens.push({
      type: Types.Italic,
      range: [startPos, this.bufferCursor],
      tokens: inlineTokens,
      wasClosed,
    });
  }

  private processText(c: string, startPos: number, tokens: Token[]): void {
    const prevToken = tokens[tokens.length - 1];

    if(prevToken && prevToken.type === Types.Text) {
      prevToken.range[1] = startPos + 1;
      prevToken.text += c;
    } else {
      tokens.push({
        type: Types.Text,
        text: c,
        range: [startPos, startPos + 1]
      });
    }
  }

  private processHeader(startPos: number, tokens: Token[]): void {
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
        range: [startPos, this.bufferCursor],
        tokens: inlineTokens,
        level: level + 1,
        hasAfterSpace: finalC === " ",
      });
    } else {
      // process this as text
      this.processParagraph(startPos, tokens);
    }
  }

  private processParagraph(startPos: number, tokens: Token[]): void {
    this.rewind();
    const inlineTokens = this.inlineTokens();
    tokens.push({
      type: Types.Paragraph,
      range: [startPos, this.bufferCursor],
      tokens: inlineTokens,
    });
  }

  private processLink(startPos: number, tokens: Token[]): void {
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
      range: [startPos, this.bufferCursor],
      text,
      dest: dest.length > 0 ? dest : null,
      raw,
      wasClosed,
    });
  }

  private processImage(startPos: number, tokens: Token[]): void {
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
      range: [startPos, this.bufferCursor],
      altText,
      url: url.length > 0 ? url : null,
      raw,
      wasClosed,
    });
  }

  private inlineTokens(predicate?: (c: string, nextC: string) => boolean): Token[] {
    const tokens: Token[] = [];

    while(!this.isBufferEnd() && !this.match("\n")) {
      const startPos = this.bufferCursor;
      const c = this.advanceWithChar();
      const nextC = this.peekChar();

      if(predicate && !predicate(c, nextC)) break;

      switch(c) {
        case "`":
          this.processCode(startPos, tokens);
          break;
        case "*":
          if(this.advanceIfMatch("*")) {
            this.processBold(startPos, tokens);
          } else {
            this.processItalic(startPos, tokens);
          }
          break;
        case "[":
          this.processLink(startPos, tokens);
          break;
        case "!":
          if(this.advanceIfMatch("[")) {
            this.processImage(startPos, tokens);
          } else {
            this.processText(c, startPos, tokens);
          }
          break;
        default:
          this.processText(c, startPos, tokens);
          break;
      }
    }

    return tokens;
  }

  private blockTokens(): Token[] {
    const tokens: Token[] = [];

    while(!this.isBufferEnd()) {
      const startPos = this.bufferCursor;
      const c = this.advanceWithChar();

      switch(c) {
        case "#": 
          this.processHeader(startPos, tokens);
          break;
        case "\n":
          tokens.push({
            type: Types.NewLine,
            range: [startPos, startPos + 1],
          });
          break;
        default: this.processParagraph(startPos, tokens);
      }
    }

    return tokens;
  }

  scanTokens(): Token[] {
    const tokens = this.blockTokens();
    return tokens;
  }
}
