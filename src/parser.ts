import Tree, {
  MDNode,
  Text,
  Paragraph,
  Italic,
  NewLine,
  Bold,
  Code,
  Header,
  Link
} from "./tree";
import { Types, Token, BlockTokens } from "./tokens";
import Lexer from "./lexer";

function printTokens(tokens: Token[], depth = 0): void {
  const spaces = "".padStart(depth * 2, " ");
  for(const token of tokens) {
    const { type, range } = token;
    console.log(`${spaces}${Types[type]}: [${range[0]}, ${range[1]}]`);

    if(Array.isArray((token as any).tokens)) {
      printTokens((token as any).tokens, depth + 2);
    }
  }
}

function parseTokens(tokens: Token[]): MDNode[] {
  const resNodes = [];

  for(const [i, token] of tokens.entries()) {
    let nodes: MDNode[] = [];
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
      default:
        throw new Error(`Error: ${Types[token.type]} is not a valid token`);
    }
  }

  return resNodes;
}

function parser(content: string): Tree {
  const lexer = new Lexer(content);

  const tokens = lexer.scanTokens();
  printTokens(tokens);
  const nodes = parseTokens(tokens);

  return new Tree(nodes);
}

export default parser;
