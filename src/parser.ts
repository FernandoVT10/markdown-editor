import Tree, { InlineBlockNode, TextNode, LinkNode } from "./tree";
import { Types, Token } from "./types";
import { Lexer } from "./lexer";

function getTextSequence(lexer: Lexer): string {
  let text = "";

  lexer.foreachTokenWhile(token => {
    if(token.type === Types.Text) {
      text += token.value;
      return true;
    }

    return false;
  });

  return text;
}

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
      case Types.BeginH2:
      case Types.BeginH3:
      case Types.BeginH4:
      case Types.BeginH5:
      case Types.BeginH6:
        const blockNode = new InlineBlockNode(token);
        tree.addChild(blockNode);
        tree.openBlock(blockNode);
        break;
      case Types.EndBoldText:
      case Types.EndItalicText:
      case Types.EndInlineCode:
      case Types.EndH1:
      case Types.EndH2:
      case Types.EndH3:
      case Types.EndH4:
      case Types.EndH5:
      case Types.EndH6:
        tree.closeBlock(token);
        break;
      case Types.Text: {
        // this variable contains all the values of the Types.Text tokens
        const text = token.value + getTextSequence(lexer);
        const startPos = token.startPos;

        const textNode = new TextNode(text, startPos);

        tree.addChild(textNode);
        break;
      }
      case Types.BeginLinkText: {
        const linkText = getTextSequence(lexer);
        const startPos = token.startPos;

        const linkNode = new LinkNode(linkText, startPos);

        const endTextToken = lexer.getNextToken();
        if(endTextToken) linkNode.closeLinkText();

        if(lexer.peekNextToken(0)?.type === Types.BeginLinkDest) {
          // consuming the Types.BeginLinkDest token
          lexer.getNextToken();

          linkNode.setLinkDest(getTextSequence(lexer));

          const endDestToken = lexer.getNextToken();
          if(endDestToken) {
            linkNode.closeLinkDest();
          }
        }

        linkNode.closeLink();

        tree.addChild(linkNode);

        break;
      }
      case Types.NewLine:
        tree.addNewLine(token.startPos);
        break;
      default:
        throw new Error(`Error: ${token.type} is not a valid token type`);
    }
  }

  tree.closeUnclosedBlocks(content.length);

  return tree;
}

export default parser;
