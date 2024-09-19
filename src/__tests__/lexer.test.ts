import Lexer from "../lexer";
import { Types, Tokens, Token } from "../tokens";

function setupInlineTokens(buffer: string): Token[] {
  const lexer = new Lexer(buffer);
  const { tokens } = lexer.scan();

  const paragraphToken = tokens[0] as Tokens.Paragraph;
  expect(paragraphToken.type).toBe(Types.Paragraph);

  return paragraphToken.tokens;
};

describe("Lexer", () => {
  describe("Paragraph", () => {
    it("should create a paragraph", () => {
      const buffer = "test";
      const lexer = new Lexer(buffer);

      const { tokens } = lexer.scan();
      expect(tokens).toHaveLength(1);

      const token = tokens[0] as Tokens.Paragraph;

      expect(token.type).toBe(Types.Paragraph);
      expect(token.range).toEqual({
        start: { line: 0, col: 0 },
        end: { line: 0, col: buffer.length },
      });

      expect(token.tokens[0].type).toBe(Types.Text);
    });
  });

  describe("Text", () => {
    it("returns a text token", () => {
      const text = "test";
      const tokens = setupInlineTokens(text);
      expect(tokens).toHaveLength(1);

      const token = tokens[0] as Tokens.Text;
      expect(token.type).toBe(Types.Text);
      expect(token.text).toBe(text);

      expect(token.range).toEqual({
        start: { line: 0, col: 0 },
        end: { line: 0, col: text.length },
      });
    });
  });

  describe("Code", () => {
    it("returns a code token", () => {
      const buffer = "`# **Code**`";
      const tokens = setupInlineTokens(buffer);
      expect(tokens).toHaveLength(1);

      const token = tokens[0] as Tokens.Code;
      expect(token.type).toBe(Types.Code);
      expect(token.range).toEqual({
        start: { line: 0, col: 0 },
        end: { line: 0, col: buffer.length },
      });
      expect(token.content).toBe(buffer.replace(/`/g, ""));
      expect(token.wasClosed).toBeTruthy();
    });

    it("should work without closing the code block", () => {
      const buffer = "`test";
      const token = setupInlineTokens(buffer)[0] as Tokens.Code;
      expect(token.type).toBe(Types.Code);
      expect(token.range).toEqual({
        start: { line: 0, col: 0 },
        end: { line: 0, col: buffer.length },
      });
      expect(token.content).toBe("test");
      expect(token.wasClosed).toBeFalsy();
    });

    it("stops consuming characters after a new line if code wasn't closed", () => {
      const code = "`test"
      const buffer = `${code}\ntext`;
      const token = setupInlineTokens(buffer)[0] as Tokens.Code;
      expect(token.type).toBe(Types.Code);
      expect(token.range).toEqual({
        start: { line: 0, col: 0 },
        end: { line: 0, col: code.length },
      });
      expect(token.content).toBe("test");
      expect(token.wasClosed).toBeFalsy();
    });
  });

  describe("Header", () => {
    it("returns a header token with its tokens", () => {
      const buffer = "## hello";
      const lexer = new Lexer(buffer);

      const { tokens } = lexer.scan();
      expect(tokens).toHaveLength(1);

      const token = tokens[0] as Tokens.Header;
      expect(token.type).toBe(Types.Header);
      expect(token.range).toEqual({
        start: { line: 0, col: 0 },
        end: { line: 0, col: buffer.length },
      });
      expect(token.level).toBe(2);
      expect(token.hasAfterSpace).toBeTruthy();

      expect(token.tokens).toHaveLength(1);
      expect(token.tokens[0].type).toBe(Types.Text);
      expect(token.tokens[0].range).toEqual({
        start: { line: 0, col: 3 },
        end: { line: 0, col: buffer.length },
      });
    });

    it("returns a header token after a new line", () => {
      const buffer = "\n## test";
      const lexer = new Lexer(buffer);

      const hToken = lexer.scan().tokens[1] as Tokens.Header;
      expect(hToken.type).toBe(Types.Header);
    });

    it("doesn't return a header token if # is not the first char", () => {
      const buffer = "0## test";
      const lexer = new Lexer(buffer);
      const { tokens } = lexer.scan();
      expect(tokens).toHaveLength(1)

      expect(tokens[0].type).not.toBe(Types.Header);
    });

    it("returns hasAfterSpace to false", () => {
      const buffer = "#";
      const lexer = new Lexer(buffer);
      const token = lexer.scan().tokens[0] as Tokens.Header;

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
      expect(token.range).toEqual({
        start: { line: 0, col: 0 },
        end: { line: 0, col: buffer.length },
      });
      expect(token.wasClosed).toBeTruthy();

      expect(token.tokens).toHaveLength(1);
      expect(token.tokens[0].type).toBe(Types.Text);
    });

    it("should handle not closing the block well", () => {
      const buffer = "**bar";
      const token = setupInlineTokens(buffer)[0] as Tokens.Bold;
      expect(token.type).toBe(Types.Bold);
      expect(token.range).toEqual({
        start: { line: 0, col: 0 },
        end: { line: 0, col: buffer.length },
      });
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
      expect(token.range).toEqual({
        start: { line: 0, col: 0 },
        end: { line: 0, col: buffer.length },
      });
      expect(token.wasClosed).toBeTruthy();

      // Italic Token's tokens
      expect(token.tokens).toHaveLength(1);
      expect(token.tokens[0].type).toBe(Types.Text);
    });

    it("should handle not closing the block well", () => {
      const buffer = "*bar";
      const token = setupInlineTokens(buffer)[0] as Tokens.Italic;
      expect(token.type).toBe(Types.Italic);
      expect(token.range).toEqual({
        start: { line: 0, col: 0 },
        end: { line: 0, col: buffer.length },
      });
      expect(token.wasClosed).toBeFalsy();

      // Bold Token's tokens
      expect(token.tokens).toHaveLength(1);
      expect(token.tokens[0].type).toBe(Types.Text);
    });
  });

  describe("New Line", () => {
    it("should end the current block token", () => {
      const buffer = "# Block 1\n# Block 2";
      const lexer = new Lexer(buffer);

      const { tokens } = lexer.scan();
      expect(tokens).toHaveLength(3);

      // NOTE: token number 0 is the new line token
      expect(tokens[0].type).toBe(Types.Header);
      expect(tokens[0].range).toEqual({
        start: { line: 0, col: 0 },
        end: { line: 0, col: 9 },
      });

      expect(tokens[2].type).toBe(Types.Header);
      expect(tokens[2].range).toEqual({
        start: { line: 1, col: 0 },
        end: { line: 1, col: 9 },
      });
    });

    it("should return a new line token", () => {
      const buffer = "\n";
      const lexer = new Lexer(buffer);
      const { tokens } = lexer.scan();
      expect(tokens).toHaveLength(1);

      expect(tokens[0].type).toBe(Types.NewLine);
      expect(tokens[0].range).toEqual({
        start: { line: 0, col: 0 },
        end: { line: 0, col: 1 },
      });
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
      expect(token.range).toEqual({
        start: { line: 0, col: 0 },
        end: { line: 0, col: buffer.length },
      });
      expect(token.raw).toBe(buffer);
      expect(token.wasClosed).toBeTruthy();
    });

    it("returns a link with only its destination", () => {
      const buffer = "[text]";
      const token = setupInlineTokens(buffer)[0] as Tokens.Link;

      expect(token.type).toBe(Types.Link);
      expect(token.text).toBe("text");
      expect(token.dest).toBeNull();
      expect(token.range).toEqual({
        start: { line: 0, col: 0 },
        end: { line: 0, col: buffer.length },
      });
      expect(token.raw).toBe(buffer);
      expect(token.wasClosed).toBeFalsy();
    });

    it("returns the raw buffer", () => {
      const buffer = "[text](test";
      const token = setupInlineTokens(buffer)[0] as Tokens.Link;
      expect(token.raw).toBe(buffer);
    });

    describe("stops consuming chars after new line if", () => {
      it("text wasn't closed", () => {
        const link = "[text";
        const buffer = `${link}\ntest`;
        const token = setupInlineTokens(buffer)[0] as Tokens.Link;
        expect(token.range).toEqual({
          start: { line: 0, col: 0 },
          end: { line: 0, col: link.length },
        });
      });

      it("dest wasn't closed", () => {
        const link = "[text](dest";
        const buffer = `${link}\ntest`;
        const token = setupInlineTokens(buffer)[0] as Tokens.Link;
        expect(token.range).toEqual({
          start: { line: 0, col: 0 },
          end: { line: 0, col: link.length },
        });
      });
    });
  });

  describe("Image", () => {
    it("returns an image", () => {
      const altText = "alt";
      const url = "https://a/image.jpg";
      const buffer = `![${altText}](${url})`;

      const token = setupInlineTokens(buffer)[0] as Tokens.Image;
      expect(token.type).toBe(Types.Image);
      expect(token.range).toEqual({
        start: { line: 0, col: 0 },
        end: { line: 0, col: buffer.length },
      });
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
      expect(token.range).toEqual({
        start: { line: 0, col: 0 },
        end: { line: 0, col: buffer.length },
      });
      expect(token.altText).toBe(altText);
      expect(token.url).toBeNull();
      expect(token.raw).toBe(buffer);
      expect(token.wasClosed).toBeFalsy();
    });

    describe("stops consuming chars after new line if", () => {
      it("altText wasn't closed", () => {
        const image = "![text";
        const buffer = `${image}\ntest`;
        const token = setupInlineTokens(buffer)[0] as Tokens.Link;
        expect(token.range).toEqual({
          start: { line: 0, col: 0 },
          end: { line: 0, col: image.length },
        });
      });

      it("url wasn't closed", () => {
        const image = "![text](image.webp";
        const buffer = `${image}\ntest`;
        const token = setupInlineTokens(buffer)[0] as Tokens.Link;
        expect(token.range).toEqual({
          start: { line: 0, col: 0 },
          end: { line: 0, col: image.length },
        });
      });
    });
  });

  describe("Horizontal Rule", () => {
    const testRule = (buffer: string) => {
      const lexer = new Lexer(buffer);
      const { tokens } = lexer.scan();

      expect(tokens).toHaveLength(1);

      const rule = tokens[0] as Tokens.Rule;
      expect(rule.type).toBe(Types.Rule);
      expect(rule.range).toEqual({
        start: { line: 0, col: 0 },
        end: { line: 0, col: buffer.length },
      });
      expect(rule.raw).toBe(buffer);
    };

    describe("returns a rule", () => {
      it("using \"-\"", () => {
        testRule("---");
      });

      it("using \"*\"", () => {
        testRule("***");
      });

      it("using \"_\"", () => {
        testRule("___");
      });
    });

    it("returns a rule ignoring spaces in the middle", () => {
      testRule("-   -    -");
    });

    it("returns a rule if buff contains more than 3 equal chars", () => {
      testRule("-------");
    });

    it("doesn't return a rule if line starts with space", () => {
      const lexer = new Lexer(" ---");
      const rule = lexer.scan().tokens[0] as Tokens.Rule;
      expect(rule.type).not.toBe(Types.Rule);
    });

    it("doesn't return a rule if there's an invalid char", () => {
      const lexer = new Lexer("--->");
      const rule = lexer.scan().tokens[0] as Tokens.Rule;
      expect(rule.type).not.toBe(Types.Rule);
    });
  });

  it.todo("Unordered list");

  // describe("Unordered List", () => {
  //   const testUnorderedList = (buffer: string): void => {
  //     const lexer = new Lexer(buffer);
  //
  //     const tokens = lexer.scanTokens();
  //     expect(tokens).toHaveLength(1);
  //
  //     const list = tokens[0] as Tokens.List;
  //     expect(list.type).toBe(Types.List);
  //     expect(list.range).toEqual([0, buffer.length]);
  //     expect(list.marker).toBe("-");
  //     expect(list.tokens).toHaveLength(1);
  //
  //     const text = list.tokens[0];
  //     expect(text.type).toBe(Types.Text);
  //     expect(text.range).toEqual([1, buffer.length]);
  //   };
  //
  //   describe("returns an unordered list", () => {
  //     it("using \"-\"", () => {
  //       testUnorderedList("- Hello");
  //     });
  //
  //     it("using \"*\"", () => {
  //       testUnorderedList("* Hello");
  //     });
  //   });
  //
  //   it("doesn't return a list if there's a character after list mark", () => {
  //     const buffer = "-Hello";
  //     const lexer = new Lexer(buffer);
  //     const token = lexer.scanTokens()[0] as Tokens.List;
  //     expect(token.type).not.toBe(Types.List);
  //   });
  //
  //   it("doesn't return a list if there's not a space after list mark", () => {
  //     const buffer = "-";
  //     const lexer = new Lexer(buffer);
  //     const token = lexer.scanTokens()[0] as Tokens.List;
  //     expect(token.type).not.toBe(Types.List);
  //   });
  // });
});
