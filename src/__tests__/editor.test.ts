import Editor from "../editor";

console.log = () => {};

const expectCursorPos = (editor: Editor, x: number, y: number) => {
  expect(editor.cursor.getPos()).toEqual({ x, y });
};

describe("Editor", () => {
  let editor: Editor;
  let container: HTMLDivElement;

  const dispatchKeydown = (opts: Partial<KeyboardEvent>) => {
    const event = new KeyboardEvent("keydown", opts);
    container.dispatchEvent(event);
  };

  beforeEach(() => {
    container = document.createElement("div");
    editor = new Editor(container);
  });

  describe("adding chars", () => {
    it("adds char", () => {;
      dispatchKeydown({ key: "a" });
      expect(editor.buffer).toHaveLength(1);
      expect(editor.buffer[0]).toBe("a");
      expectCursorPos(editor, 1, 0);
    });

    it("adds new line", () => {
      dispatchKeydown({ key: "Enter" });

      expect(editor.buffer).toHaveLength(2);
      expect(editor.buffer[0]).toBe("\n");
      expect(editor.buffer[1]).toBe("");
      expectCursorPos(editor, 0, 1);
    });

    it("adds new line after char", () => {
      editor.buffer = ["a"];
      editor.cursor.setPos(1, 0);
      dispatchKeydown({ key: "Enter" });

      expect(editor.buffer).toHaveLength(2);
      expect(editor.buffer[0]).toBe("a\n");
      expectCursorPos(editor, 0, 1);
    });

    it("adds new line between chars", () => {
      editor.buffer = ["aa"];
      editor.cursor.setPos(1, 0);
      dispatchKeydown({ key: "Enter" });

      expect(editor.buffer).toHaveLength(2);
      expect(editor.buffer[0]).toBe("a\n");
      expect(editor.buffer[1]).toBe("a");
      expectCursorPos(editor, 0, 1);
    });
  });

  describe("remove char with Backspace", () => {
    it("removes char", () => {
      const text = "text";
      editor.buffer[0] = text;
      editor.cursor.setPos(2, 0);
      dispatchKeydown({ key: "Backspace" });
      expect(editor.buffer[0]).toBe("txt");
      expectCursorPos(editor, 1, 0);
    });

    it("removes new line", () => {
      const text = "text";
      editor.buffer = [text + "\n", ""];
      editor.cursor.setPos(0, 1);
      dispatchKeydown({ key: "Backspace" });
      expect(editor.buffer).toHaveLength(1);
      expect(editor.buffer[0]).toBe(text);
      expectCursorPos(editor, text.length, 0);
    });

    it("removes line with chars in it", () => {
      editor.buffer = ["text\n", "foo"];
      editor.cursor.setPos(0, 1);
      dispatchKeydown({ key: "Backspace" });
      expect(editor.buffer).toHaveLength(1);
      expect(editor.buffer[0]).toBe("textfoo");
      expectCursorPos(editor, 4, 0);
    });

    it("removes line between lines", () => {
      editor.buffer = ["text\n", "\n", "foo"];
      editor.cursor.setPos(0, 1);
      dispatchKeydown({ key: "Backspace" });
      expect(editor.buffer).toHaveLength(2);
      expect(editor.buffer[0]).toBe("text\n");
      expect(editor.buffer[1]).toBe("foo");
      expectCursorPos(editor, 4, 0);
    });

    it("does nothing if the cursor is at the beginning", () => {
      editor.buffer = ["text\n"];
      editor.cursor.setPos(0, 0);
      dispatchKeydown({ key: "Backspace" });
      expect(editor.buffer).toEqual(editor.buffer);
      expectCursorPos(editor, 0, 0);
    });
  });

  describe("removing chars with CTRL + Backspace", () => {
    it("removes a sequence of alphanumeric chars", () => {
      const seq = "AB10cd";
      editor.buffer = [seq];
      editor.cursor.setPos(seq.length, 0);
      dispatchKeydown({ key: "Backspace", ctrlKey: true });
      expect(editor.buffer[0]).toBe("");
      expectCursorPos(editor, 0, 0);
    });

    it("stops removing if there's a non alphanumeric char", () => {
      const seq = "AB$10cd";
      editor.buffer = [seq];
      editor.cursor.setPos(seq.length, 0);
      dispatchKeydown({ key: "Backspace", ctrlKey: true });
      expect(editor.buffer[0]).toBe("AB$");
      expectCursorPos(editor, 3, 0);
    });

    it("removes only 1 char if it's not alphanumeric", () => {
      const seq = "abc$";
      editor.buffer = [seq];
      editor.cursor.setPos(seq.length, 0);
      dispatchKeydown({ key: "Backspace", ctrlKey: true });
      expect(editor.buffer[0]).toBe("abc");
      expectCursorPos(editor, 3, 0);
    });

    it("stops removing before new line", () => {
      const seq = "foo";
      editor.buffer = ["abc\n", seq];
      editor.cursor.setPos(seq.length, 1);
      dispatchKeydown({ key: "Backspace", ctrlKey: true });

      expect(editor.buffer).toHaveLength(2);

      expect(editor.buffer[0]).toBe(editor.buffer[0]);
      expect(editor.buffer[1]).toBe("");

      expectCursorPos(editor, 0, 1);
    });

    it("removes new line", () => {
      editor.buffer = ["abc\n", ""];
      editor.cursor.setPos(0, 1);
      dispatchKeydown({ key: "Backspace", ctrlKey: true });
      expect(editor.buffer).toHaveLength(1);
      expect(editor.buffer[0]).toBe("abc");
      expectCursorPos(editor, 3, 0);
    });

    it("does nothing if the cursor is at the beginning", () => {
      editor.buffer = ["text\n"];
      editor.cursor.setPos(0, 0);
      dispatchKeydown({ key: "Backspace", ctrlKey: true });
      expect(editor.buffer).toEqual(editor.buffer);
      expectCursorPos(editor, 0, 0);
    });
  });

  it("should add \\t when pressing tab", () => {
    dispatchKeydown({ key: "Tab" });
    expect(editor.buffer[0]).toBe("\t");
    expectCursorPos(editor, 1, 0);
  });

  describe("pasting text", () => {
    const dispatchPaste = (text: string) => {
      const event = new Event("paste") as any;
      event.clipboardData = {
        getData: () => text,
      };
      container.dispatchEvent(event);
    };

    it("pastes one word", () => {
      editor.cursor.setPosX(0);
      dispatchPaste("neovim");
      expect(editor.buffer[0]).toBe("neovim");
      expectCursorPos(editor, 6, 0);
    });

    it("pastes text in middle of other text", () => {
      editor.cursor.setPosX(2);
      editor.buffer = ["nevim"];

      dispatchPaste("o");

      expect(editor.buffer[0]).toBe("neovim");
      expectCursorPos(editor, 3, 0);
    });

    it("pastes text that contains a new line", () => {
      editor.cursor.setPosX(5);
      editor.buffer = ["firstsecond"];

      dispatchPaste("test\ntest");

      expect(editor.buffer).toHaveLength(2);
      expect(editor.buffer[0]).toBe("firsttest");
      expect(editor.buffer[1]).toBe("testsecond");
      expectCursorPos(editor, 4, 1);
    });

    it("pastes text with several new lines in empty buffer", () => {
      dispatchPaste("hello\nworld\n!\n");

      expect(editor.buffer).toHaveLength(4);
      expect(editor.buffer[0]).toBe("hello");
      expect(editor.buffer[1]).toBe("world");
      expect(editor.buffer[2]).toBe("!");
      expect(editor.buffer[3]).toBe("");
      expectCursorPos(editor, 0, 3);
    });

    it("does nothing when there's no text to paste", () => {
      editor.buffer = ["test"];
      dispatchPaste("");

      expect(editor.buffer).toHaveLength(1);
      expect(editor.buffer[0]).toBe("test");
      expectCursorPos(editor, 0, 0);
    });
  });
});
