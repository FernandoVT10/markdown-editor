import MDNode from "./tree/MDNode";

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
  Blockquote,
} from "./tree/nodes";
import { Token, BlockTokens, Types } from "./tokens";

export function parseToken(token: Token): MDNode {
  let nodes: any[] = [];
  if(Array.isArray((token as BlockTokens).tokens)) {
    nodes = parseTokens((token as BlockTokens).tokens);
  }

  switch(token.type) {
    case Types.Text:
      return new Text(token.text, token.range);
    case Types.Paragraph:
      return new Paragraph(token.range, nodes);
    case Types.Italic:
      return new Italic(token, nodes);
    case Types.Bold:
      return new Bold(token, nodes);
    case Types.NewLine: 
      return new NewLine(token);
    case Types.Code:
      return new Code(token);
    case Types.Header:
      return new Header(token, nodes);
    case Types.Link:
      return new Link(token);
    case Types.Image:
      return new MDImage(token);
    case Types.Rule:
      return new Rule(token);
    case Types.Blockquote:
      return new Blockquote(token, nodes);
    default: {
      // TODO: Remove this
      return new Text(token.type.toString(), token.range);
    }
    // case Types.List:
    //   resNodes.push(new MDList(token, nodes));
    //   break;
   }
}

export function parseTokens(tokens: Token[]): MDNode[] {
  const resNodes: any[] = [];

  for(const [_i, token] of tokens.entries()) {
    resNodes.push(parseToken(token));
  }

  return resNodes;
}
