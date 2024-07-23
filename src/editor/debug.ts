import Editor, { MDBuffer } from ".";
import Lexer from "../lexer";
import { Token, BlockTokens, Types } from "../tokens";

function areBuffersEq(b1: MDBuffer, b2: MDBuffer): boolean {
  if(b1.length !== b2.length) return false;

  for(let i = 0; i < b1.length; i++) {
    if(b1[i].length !== b2[i].length) return false;
  }

  return true;
}

function getTokensList(tokens: Token[]): HTMLUListElement {
  const list = document.createElement("ul");

  for(const token of tokens) {
    const liEl = document.createElement("li");

    const startLine = token.range.start.line;
    const startCol = token.range.start.col;
    const endLine = token.range.end.line;
    const endCol = token.range.end.col;

    const typeEl = document.createElement("span");
    typeEl.classList.add("type");
    typeEl.innerText = `${Types[token.type]}`;
    liEl.appendChild(typeEl);

    const rangeEl = document.createElement("span");
    rangeEl.classList.add("range");
    rangeEl.innerText = `[${startLine}, ${startCol}] - [${endLine}, ${endCol}]`;
    liEl.appendChild(rangeEl);

    list.appendChild(liEl);

    if(Array.isArray((token as BlockTokens).tokens)) {
      const childList = getTokensList((token as BlockTokens).tokens)
      list.appendChild(childList);
    }
  }

  return list;
}

function updateTokensPreview(tokens: Token[]): void {
  const tokensPreview = document.getElementById("tokens-preview") as HTMLDivElement;

  tokensPreview.innerHTML = "";
  tokensPreview.appendChild(getTokensList(tokens));
}

function setupTokensPreview(editorBuffer: MDBuffer): () => void {
  let previousBuffer = [...editorBuffer];
  let previewTokens = false;

  const togglePreview = document.getElementById("toggle-token-preview") as HTMLButtonElement;
  const editorContainer = document.getElementById("editor-container") as HTMLDivElement; 

  togglePreview.addEventListener("click", () => {
    if(previewTokens) {
      editorContainer.classList.remove("active");
      togglePreview.classList.remove("active");
      previewTokens = false;
    } else {
      editorContainer.classList.add("active");
      togglePreview.classList.add("active");
      previewTokens = true;
    }
  });

  return () => {
    if(!areBuffersEq(previousBuffer, editorBuffer) && previewTokens) {
      const lexer = new Lexer(editorBuffer.join(""));
      const tokens = lexer.scanTokens();

      updateTokensPreview(tokens);

      previousBuffer = [...editorBuffer];
    }
  };
}

export function setup(editor: Editor): void {
  if(process.env.NODE_ENV === "test") return;

  const cursorPosX = document.getElementById("cursor-pos-x") as HTMLElement;
  const cursorPosY = document.getElementById("cursor-pos-y") as HTMLElement;

  const updateTokensPreview = setupTokensPreview(editor.buffer);

  const loop = () => {
    const { x, y } = editor.cursor.getPos();
    cursorPosX.innerText = x.toString();
    cursorPosY.innerText = y.toString();

    updateTokensPreview();
    window.requestAnimationFrame(loop);
  }

  loop();
}

export default {
  setup,
};
