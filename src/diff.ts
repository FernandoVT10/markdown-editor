import { Token, TokenRange } from "./tokens";

export enum DiffTypes {
  Modification,
  Deletion,
  Insertion,
}

type Base = {
  tokenIndex: number;
}

type Modification = Base & {
  type: DiffTypes.Modification;
  token: Token;
}

type Deletion = Base & {
  type: DiffTypes.Deletion;
}

type Insertion = Base & {
  type: DiffTypes.Insertion;
  token: Token;
}

type DiffType = (
  Modification
  | Deletion
  | Insertion
)

export function areRangesEq(r1: TokenRange, r2: TokenRange): boolean {
  return r1.start.col === r2.start.col
    && r1.start.line === r2.start.line
    && r1.end.col === r2.end.col
    && r1.end.line === r2.end.line;
}

export function getTokenArrDiff(oldArr: Token[], newArr: Token[]): DiffType[] {
  let res: DiffType[] = [];

  const oldArrLen = oldArr.length;
  const newArrLen = newArr.length;
  const maxLen = Math.max(oldArrLen, newArrLen);

  let oldTknI = 0;
  let newTknI = 0;

  for(let tknIndex = 0; tknIndex < maxLen; tknIndex++) {
    const oldTkn = oldArr[oldTknI];
    const newTkn = newArr[newTknI];

    if(!oldTkn) {
      // insert new token
      res.push({
        type: DiffTypes.Insertion,
        tokenIndex: tknIndex,
        token: newTkn,
      });

      newTknI++;
    } else if(!newTkn) {
      // delete old token
      res.push({
        type: DiffTypes.Deletion,
        tokenIndex: tknIndex,
      });

      oldTknI++;
    } else if(oldTkn.type !== newTkn.type) {
      if(oldArrLen === newArrLen) {
        // these 2 actions together creates the replace action
        res.push(
          {
            type: DiffTypes.Deletion,
            tokenIndex: tknIndex,
          },
          {
            type: DiffTypes.Insertion,
            tokenIndex: tknIndex,
            token: newTkn,
          },
        );

        newTknI++;
        oldTknI++;
      } else if(oldArrLen > newArrLen) {
        // old array have more tokens, we need to delete them.
        res.push({
          type: DiffTypes.Deletion,
          tokenIndex: tknIndex,
        });

        oldTknI++;
      } else {
        res.push({
          type: DiffTypes.Insertion,
          tokenIndex: tknIndex,
          token: newTkn,
        });

        newTknI++;
      }
    } else if(!areRangesEq(oldTkn.range, newTkn.range)) {
      res.push({
        type: DiffTypes.Modification,
        tokenIndex: tknIndex,
        token: newTkn,
      });

      oldTknI++;
      newTknI++;
    } else {
      oldTknI++;
      newTknI++;
    }
  }

  return res;
}
