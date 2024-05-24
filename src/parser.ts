import Tree, { BlockNode, TextNode } from "./tree";
import { Types, Token } from "./types";
import { Lexer } from "./lexer";

function parser(content: string): Tree {
  const lexer = new Lexer(content);
  lexer.processTokens();

  const tree = new Tree;
  let token: Token | undefined;

  while((token = lexer.getNextToken()) !== undefined) {
    switch(token.type) {
      case Types.BeginBoldText:
      case Types.BeginItalicText:
      case Types.BeginInlineCode:
      case Types.BeginH1:
        const blockNode = new BlockNode(token);
        tree.addChild(blockNode);
        tree.openBlock(blockNode);
        break;
      case Types.EndBoldText:
      case Types.EndItalicText:
      case Types.EndInlineCode:
      case Types.EndH1:
        tree.closeBlock(token.value, token.startPos);
        break;
      case Types.Text:
        let text = token.value as string;
        const startPos = token.startPos;

        lexer.foreachTokenWhile(token => {
          if(token.type === Types.Text) {
            text += token.value;
            return true;
          }

          return false;
        });

        const textNode = new TextNode(text, startPos);

        tree.addChild(textNode);
        break;
      default:
        throw new Error(`Error: ${token.type} is not a valid token type`);
    }
  }

  tree.closeUnclosedBlocks(content.length);

  return tree;
}

export default parser;
