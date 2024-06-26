import {
  MDNode,
  MDBlockNode,
  Text,
  Paragraph,
  Italic,
  Bold,
  NewLine,
  Code,
  Header,
  Link,
  MDImage
} from "./tree";

import { Types, Token, BlockTokens } from "./tokens";
import { DEBUG, printTokens } from "./debug";

import Lexer from "./lexer";

export function parseTokens(line: number, tokens: Token[]): MDNode[] {
  const resNodes: any[] = [];

  for(const [i, token] of tokens.entries()) {
    let nodes: any[] = [];
    if(Array.isArray((token as BlockTokens).tokens)) {
      nodes = parseTokens(line, (token as BlockTokens).tokens);
    }

    switch(token.type) {
      case Types.Paragraph:
        resNodes.push(new Paragraph(line, token.range, nodes))
        break;
      case Types.Text:
        resNodes.push(new Text(line, token.text, token.range));
        break;
      case Types.Italic:
        resNodes.push(new Italic(line, token, nodes));
        break;
      case Types.Bold:
        resNodes.push(new Bold(line, token, nodes));
        break;
      case Types.NewLine: {
        const nextToken = tokens[i + 1];

        if(!nextToken || nextToken.type === Types.NewLine) {
          resNodes.push(new NewLine(line, token.range));
        }
      } break;
      case Types.Code:
        resNodes.push(new Code(line, token));
        break;
      case Types.Header:
        resNodes.push(new Header(line, token, nodes));
        break;
      case Types.Link:
        resNodes.push(new Link(line, token));
        break;
      case Types.Image:
        resNodes.push(new MDImage(line, token));
        break;
    }
  }

  return resNodes;
}

export function parseLine(line: number, buffer: string): MDBlockNode {
  const lexer = new Lexer(buffer);
  const tokens = lexer.scanTokens();

  const nodes = parseTokens(line, tokens);

  return nodes[0] as MDBlockNode;
}
