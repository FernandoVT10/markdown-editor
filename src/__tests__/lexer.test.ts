import Lexer from "../lexer";
import { Types, Tokens, Token } from "../tokens";

function setupInlineTokens(buffer: string): Token[] {
  const lexer = new Lexer(buffer);
  const paragraphToken = lexer.scanTokens()[0] as Tokens.Paragraph;

  expect(paragraphToken.type).toBe(Types.Paragraph);

  return paragraphToken.tokens;
};

describe("Lexer", () => {
  describe("Text", () => {
    it("returns a text token", () => {
      const buffer = "test";
      const tokens = setupInlineTokens(buffer);
      expect(tokens).toHaveLength(1);

      const token = tokens[0] as Tokens.Text;
      expect(token.type).toBe(Types.Text);
      expect(token.text).toBe(buffer);
      expect(token.range).toEqual([0, buffer.length]);
    });
  });

  describe("Code", () => {
    it("returns a code token", () => {
      const buffer = "`# **Code**`";
      const tokens = setupInlineTokens(buffer);
      expect(tokens).toHaveLength(1);

      const token = tokens[0] as Tokens.Code;
      expect(token.type).toBe(Types.Code);
      expect(token.range).toEqual([0, buffer.length]);
      expect(token.content).toBe(buffer.replace(/`/g, ""));
      expect(token.wasClosed).toBeTruthy();
    });

    it("should work without closing the code block", () => {
      const buffer = "`test";
      const token = setupInlineTokens(buffer)[0] as Tokens.Code;
      expect(token.type).toBe(Types.Code);
      expect(token.range).toEqual([0, buffer.length]);
      expect(token.content).toBe("test");
      expect(token.wasClosed).toBeFalsy();
    });

    it("stops consuming characters after a new line if code wasn't closed", () => {
      const code = "`test"
      const buffer = `${code}\ntext`;
      const token = setupInlineTokens(buffer)[0] as Tokens.Code;
      expect(token.type).toBe(Types.Code);
      expect(token.range).toEqual([0, code.length]);
      expect(token.content).toBe("test");
      expect(token.wasClosed).toBeFalsy();
    });
  });

  describe("Header", () => {
    it("returns a header token with its tokens", () => {
      const buffer = "## hello";
      const lexer = new Lexer(buffer);

      const tokens = lexer.scanTokens();
      expect(tokens).toHaveLength(1);

      const token = tokens[0] as Tokens.Header;
      expect(token.type).toBe(Types.Header);
      expect(token.range).toEqual([0, buffer.length]);
      expect(token.level).toBe(2);
      expect(token.hasAfterSpace).toBeTruthy();

      expect(token.tokens).toHaveLength(1);
      expect(token.tokens[0].type).toBe(Types.Text);
      expect(token.tokens[0].range).toEqual([3, buffer.length]);
    });

    it("returns a header token after a new line", () => {
      const buffer = "\n## test";
      const lexer = new Lexer(buffer);

      const hToken = lexer.scanTokens()[1] as Tokens.Header;
      expect(hToken.type).toBe(Types.Header);
    });

    it("doesn't return a header token if # is not the first char", () => {
      const buffer = "0## test";
      const lexer = new Lexer(buffer);
      const tokens = lexer.scanTokens();
      expect(tokens).toHaveLength(1)

      expect(tokens[0].type).not.toBe(Types.Header);
    });

    it("returns hasAfterSpace to false", () => {
      const buffer = "#";
      const lexer = new Lexer(buffer);
      const token = lexer.scanTokens()[0] as Tokens.Header;

      expect(token.hasAfterSpace).toBeFalsy();
    });
  });

  describe("Bold", () => {
    it("returns a bold token with its tokens", () => {
      const buffer = "**hello**";
      const tokens = setupInlineTokens(buffer);
      expect(tokens).toHaveLength(1);

      const token = tokens[0] as Tokens.Bold;
      expect(token.type).toBe(Types.Bold);
      expect(token.range).toEqual([0, buffer.length]);
      expect(token.wasClosed).toBeTruthy();

      expect(token.tokens).toHaveLength(1);
      expect(token.tokens[0].type).toBe(Types.Text);
    });

    it("should handle not closing the block well", () => {
      const buffer = "**bar";
      const token = setupInlineTokens(buffer)[0] as Tokens.Bold;
      expect(token.type).toBe(Types.Bold);
      expect(token.range).toEqual([0, buffer.length]);
      expect(token.wasClosed).toBeFalsy();

      expect(token.tokens).toHaveLength(1);
      expect(token.tokens[0].type).toBe(Types.Text);
    });
  });

  describe("Italic", () => {
    it("returns a italic token with its tokens", () => {
      const buffer = "*hello*";
      const tokens = setupInlineTokens(buffer);
      expect(tokens).toHaveLength(1);

      const token = tokens[0] as Tokens.Italic;
      expect(token.type).toBe(Types.Italic);
      expect(token.range).toEqual([0, buffer.length]);
      expect(token.wasClosed).toBeTruthy();

      // Italic Token's tokens
      expect(token.tokens).toHaveLength(1);
      expect(token.tokens[0].type).toBe(Types.Text);
    });

    it("should handle not closing the block well", () => {
      const buffer = "*bar";
      const token = setupInlineTokens(buffer)[0] as Tokens.Italic;
      expect(token.type).toBe(Types.Italic);
      expect(token.range).toEqual([0, buffer.length]);
      expect(token.wasClosed).toBeFalsy();

      // Bold Token's tokens
      expect(token.tokens).toHaveLength(1);
      expect(token.tokens[0].type).toBe(Types.Text);
    });
  });

  describe("Paragraph", () => {
    it("should create a paragraph", () => {
      const buffer = "test";
      const lexer = new Lexer(buffer);

      const tokens = lexer.scanTokens();
      expect(tokens).toHaveLength(1);

      const token = tokens[0] as Tokens.Paragraph;

      expect(token.type).toBe(Types.Paragraph);
      expect(token.range).toEqual([0, buffer.length]);

      expect(token.tokens[0].type).toBe(Types.Text);
      expect(token.tokens[0].range).toEqual([0, buffer.length]);
    });
  });

  describe("New Line", () => {
    it("should end the current block token", () => {
      const buffer = "# Block 1\n# Block 2";
      const lexer = new Lexer(buffer);

      const tokens = lexer.scanTokens();
      expect(tokens).toHaveLength(3);

      // NOTE: token number 0 is the new line token
      expect(tokens[0].type).toBe(Types.Header);
      expect(tokens[0].range).toEqual([0, 9]);

      expect(tokens[2].type).toBe(Types.Header);
      expect(tokens[2].range).toEqual([10, buffer.length]);
    });

    it("should return a new line token", () => {
      const buffer = "\n";
      const lexer = new Lexer(buffer);
      const tokens = lexer.scanTokens();
      expect(tokens).toHaveLength(1);

      expect(tokens[0].type).toBe(Types.NewLine);
      expect(tokens[0].range).toEqual([0, 1]);
    });
  });

  describe("Link", () => {
    it("returns a link", () => {
      const text = "text";
      const dest = "https://example.com";
      const buffer = `[${text}](${dest})`;
      const token = setupInlineTokens(buffer)[0] as Tokens.Link;

      expect(token.type).toBe(Types.Link);
      expect(token.text).toBe(text);
      expect(token.dest).toBe(dest);
      expect(token.range).toEqual([0, buffer.length]);
      expect(token.raw).toBe(buffer);
      expect(token.wasClosed).toBeTruthy();
    });

    it("returns a link with only its destination", () => {
      const buffer = "[text]";
      const token = setupInlineTokens(buffer)[0] as Tokens.Link;

      expect(token.type).toBe(Types.Link);
      expect(token.text).toBe("text");
      expect(token.dest).toBeNull();
      expect(token.range).toEqual([0, buffer.length]);
      expect(token.raw).toBe(buffer);
      expect(token.wasClosed).toBeFalsy();
    });

    it("returns the raw buffer", () => {
      const buffer = "[text](test";
      const token = setupInlineTokens(buffer)[0] as Tokens.Link;
      expect(token.raw).toBe(buffer);
    });
  });

  describe("Image", () => {
    it("returns an image", () => {
      const altText = "alt";
      const url = "https://a/image.jpg";
      const buffer = `![${altText}](${url})`;

      const token = setupInlineTokens(buffer)[0] as Tokens.Image;
      expect(token.type).toBe(Types.Image);
      expect(token.range).toEqual([0, buffer.length]);
      expect(token.altText).toBe(altText);
      expect(token.url).toBe(url);
      expect(token.raw).toBe(buffer);
      expect(token.wasClosed).toBeTruthy();
    });

    it("returns an image with only its alt text", () => {
      const altText = "alt";
      const buffer = `![${altText}]`;

      const token = setupInlineTokens(buffer)[0] as Tokens.Image;
      expect(token.type).toBe(Types.Image);
      expect(token.range).toEqual([0, buffer.length]);
      expect(token.altText).toBe(altText);
      expect(token.url).toBeNull();
      expect(token.raw).toBe(buffer);
      expect(token.wasClosed).toBeFalsy();
    });
  });
});
