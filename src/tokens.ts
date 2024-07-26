export enum Types {
  Text,
  Bold,
  Italic,
  Code,
  Header,
  Paragraph,
  NewLine,
  Link,
  Image,
  Rule,
  List,
}

export type MDRange = [number, number];

export type TokenRange = {
  start: { line: number, col: number };
  end: { line: number, col: number };
};

export namespace Tokens {
  export interface Text {
    type: Types.Text;
    range: TokenRange;
    text: string;
  }

  export interface Bold {
    type: Types.Bold;
    range: TokenRange;
    tokens: Token[];
    wasClosed: boolean;
  }

  export interface Italic {
    type: Types.Italic;
    range: TokenRange;
    tokens: Token[];
    wasClosed: boolean;
  }

  export interface Code {
    type: Types.Code;
    range: TokenRange;
    content: string;
    wasClosed: boolean;
  }

  export interface Header {
    type: Types.Header;
    range: TokenRange;
    tokens: Token[];
    level: number;
    hasAfterSpace: boolean;
  }

  export interface Paragraph {
    type: Types.Paragraph;
    range: TokenRange;
    tokens: Token[];
  }

  export interface NewLine {
    type: Types.NewLine;
    range: TokenRange;
  }

  export interface Link {
    type: Types.Link;
    range: TokenRange;
    text: string;
    dest: string | null;
    raw: string;
    wasClosed: boolean;
  }

  export interface Image {
    type: Types.Image;
    range: TokenRange;
    altText: string;
    url: string | null;
    raw: string;
    wasClosed: boolean;
  }

  export interface Rule {
    type: Types.Rule;
    range: TokenRange;
    raw: string;
  }

  export interface List {
    type: Types.List;
    range: TokenRange;
    marker: string;
    tokens: Token[];
  }
}

export type BlockTokens = (
    Tokens.Bold
  | Tokens.Italic
  | Tokens.Header
  | Tokens.Paragraph
  | Tokens.List
);

export type Token = (
    Tokens.Text
  | Tokens.Bold
  | Tokens.Italic
  | Tokens.Code
  | Tokens.Header
  | Tokens.Paragraph
  | Tokens.NewLine
  | Tokens.Link
  | Tokens.Image
  | Tokens.Rule
  | Tokens.List);
