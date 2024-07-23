// @ts-nocheck
import {
  Text,
  Paragraph,
  Italic,
  Bold,
  NewLine,
  Code,
  Header,
  Link,
  MDImage,
  Rule,
  MDList,
} from "./tree/nodes";
import { MDNode, MDBlockNode } from "./tree/definitions";
import { Types, Token, BlockTokens } from "./tokens";

import Lexer from "./lexer";

export function parseTokens(tokens: Token[]): MDNode[] {
  const resNodes: any[] = [];
  return [];

  for(const [i, token] of tokens.entries()) {
    let nodes: any[] = [];
    if(Array.isArray((token as BlockTokens).tokens)) {
      nodes = parseTokens((token as BlockTokens).tokens);
    }

    switch(token.type) {
      case Types.Paragraph:
        resNodes.push(new Paragraph(token.range, nodes))
        break;
      case Types.Text:
        resNodes.push(new Text(token.text, token.range));
        break;
      case Types.Italic:
        resNodes.push(new Italic(token, nodes));
        break;
      case Types.Bold:
        resNodes.push(new Bold(token, nodes));
        break;
      case Types.NewLine: {
        const nextToken = tokens[i + 1];

        if(!nextToken || nextToken.type === Types.NewLine) {
          resNodes.push(new NewLine(token.range));
        }
      } break;
      case Types.Code:
        resNodes.push(new Code(token));
        break;
      case Types.Header:
        resNodes.push(new Header(token, nodes));
        break;
      case Types.Link:
        resNodes.push(new Link(token));
        break;
      case Types.Image:
        resNodes.push(new MDImage(token));
        break;
      case Types.Rule:
        resNodes.push(new Rule(token));
        break;
      case Types.List:
        resNodes.push(new MDList(token, nodes));
        break;
    }
  }

  return resNodes;
}

export function parseLine(buffer: string): MDBlockNode {
  const lexer = new Lexer(buffer);
  const tokens = lexer.scanTokens();

  const nodes = parseTokens(tokens);

  return nodes[0] as MDBlockNode;
}
