import {
  Token,
  BlockTokens,
  Types,
  Tokens,
  isAParentToken
} from "../tokens";

function create2DArray(rows: number, cols: number, fill: number): number[][] {
  const arr: number[][] = [];

  for(let i = 0; i < rows; i++) {
    for(let j = 0; j < cols; j++) {
      if(!Array.isArray(arr[i])) arr[i] = [];
      arr[i][j] = fill;
    }
  }

  return arr;
}

function areTokensEqual(t1: Token, t2: Token): boolean {
  if(t1.type !== t2.type) return false;

  switch(t1.type) {
    case Types.Text: {
      return t1.text === (t2 as Tokens.Text).text;
    }
    case Types.Italic: {
      return t1.wasClosed === (t2 as Tokens.Italic).wasClosed;
    }
    case Types.Bold: {
      return t1.wasClosed === (t2 as Tokens.Bold).wasClosed;
    }
    case Types.Code: {
      t2 = t2 as Tokens.Code;
      return t1.wasClosed === t2.wasClosed && t1.content === t2.content;
    }
    case Types.Header: {
      t2 = t2 as Tokens.Header;
      return t1.hasAfterSpace === t2.hasAfterSpace && t1.level === t2.level;
    }
    case Types.NewLine: {
      return true;
    }
    case Types.Link: {
      t2 = t2 as Tokens.Link;
      return t1.text === t2.text
        && t1.dest === t2.dest
        && t1.raw === t2.raw
        && t1.wasClosed === t2.wasClosed;
    }
    case Types.Image: {
      t2 = t2 as Tokens.Image;
      return t1.altText === t2.altText
        && t1.url === t2.url
        && t1.raw === t2.raw
        && t1.wasClosed === t2.wasClosed;
    }
    case Types.Rule: {
      return t1.raw === (t2 as Tokens.Rule).raw;
    }
    case Types.List: {
      console.error("not implemeted yet");
      return false;
    }
    default:
      return false;
  }
}

export enum DiffOpsTypes {
  Update,
  Insert,
  Delete,
  Replace,
  SubtreeUpd,
  SubtreeAndTknUpd,
}

type Update = {
  type: DiffOpsTypes.Update;
  pos: number;
  updatedToken: Token;
}

type Insert = {
  type: DiffOpsTypes.Insert;
  pos: number;
  insertedToken: Token;
}

type Delete = {
  type: DiffOpsTypes.Delete;
  pos: number;
}

type Replace = {
  type: DiffOpsTypes.Replace;
  pos: number;
  newToken: Token;
}

// this type is intended to update only the tokens inside a subtree
type SubtreeUpd = {
  type: DiffOpsTypes.SubtreeUpd;
  pos: number;
  ops: DiffOp[];
}

// this type is similar to SubtreeUpd but this updates also the subtree
type SubtreeAndTknUpd = {
  type: DiffOpsTypes.SubtreeAndTknUpd;
  pos: number;
  ops: DiffOp[];
  updatedToken: Token;
}

export type DiffOp = SubtreeUpd | Update | Insert | Delete | Replace | SubtreeAndTknUpd;

function getDPFromTokens(srcTokens: Token[], targetTokens: Token[]): number[][] {
  const dp = create2DArray(srcTokens.length + 1, targetTokens.length + 1, 0);

  for(let i = 0; i < dp.length; i++) {
    dp[i][0] = i;
  }

  for(let i = 0; i < dp[0].length; i++) {
    dp[0][i] = i;
  }

  for(let i = 1; i < dp.length; i++) {
    for(let j = 1; j < dp[0].length; j++) {
      if(srcTokens[i - 1].type === targetTokens[j - 1].type) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        const top = dp[i - 1][j];
        const left = dp[i][j - 1];
        const diag = dp[i - 1][j - 1];
        dp[i][j] = 1 + Math.min(top, left, diag);
      }
    }
  }

  return dp;
}

function getTokensDiff(srcTokens: Token[], targetTokens: Token[]): DiffOp[] {
  const dp = getDPFromTokens(srcTokens, targetTokens);
  return getOpsFromMatrix(srcTokens, targetTokens, dp);
}

function getOpsFromMatrix(srcTokens: Token[], targetTokens: Token[], dp: number[][]): DiffOp[] {
  const ops: DiffOp[] = [];

  let i = dp.length - 1;
  let j = dp[0].length - 1;

  while(i + j > 0) {
    const cur = dp[i][j];

    const srcToken = srcTokens[i - 1];
    const targetToken = targetTokens[j - 1];

    // check left (insertion)
    if(j > 0 && dp[i][j - 1] < cur) {
      ops.push({
        type: DiffOpsTypes.Insert,
        insertedToken: targetToken,
        pos: i,
      });

      j--;
    }
    // check top (deletion)
    else if(i > 0 && dp[i - 1][j] < cur) {
      ops.push({
        type: DiffOpsTypes.Delete,
        pos: i - 1,
      });
      i--;
    }
    // check diag (replace, skip, update)
    else if(i > 0 && j > 0 && dp[i - 1][j - 1] <= cur) {
      if(dp[i - 1][j - 1] === cur) {
        // handling tokens with tokens inside which are special
        if(isAParentToken(srcToken)) {
          if(!isAParentToken(targetToken)) {
            console.log("srcToken", srcToken, "targetToken", targetToken);
            throw new Error("srcToken is a parent but targetToken isn't");
          }

          const subtreeOps = getTokensDiff(
            (srcToken as BlockTokens).tokens,
            (targetToken as BlockTokens).tokens
          );

          let opType: DiffOpsTypes | undefined;

          // if there are ops we're gonna start with a SubtreeUpd type
          if(subtreeOps.length) opType = DiffOpsTypes.SubtreeUpd;

          // if the tokens aren't equal we choose between using SubtreeAndTknUpd if
          // the operation was assigned before or use plain Update
          if(!areTokensEqual(srcToken, targetToken)) {
            if(opType !== undefined) opType = DiffOpsTypes.SubtreeAndTknUpd;
            else opType = DiffOpsTypes.Update;
          }

          switch(opType) {
            case DiffOpsTypes.SubtreeUpd: {
              ops.push({
                type: DiffOpsTypes.SubtreeUpd,
                pos: i - 1,
                ops: subtreeOps,
              });
            } break;
            case DiffOpsTypes.SubtreeAndTknUpd: {
              ops.push({
                type: DiffOpsTypes.SubtreeAndTknUpd,
                pos: i - 1,
                ops: subtreeOps,
                updatedToken: targetToken,
              });
            } break;
            case DiffOpsTypes.Update: {
              ops.push({
                type: DiffOpsTypes.Update,
                pos: i - 1,
                updatedToken: targetToken,
              });
            } break;
          }
        } else if(!areTokensEqual(srcToken, targetToken)) {
          ops.push({
            type: DiffOpsTypes.Update,
            pos: i - 1,
            updatedToken: targetToken,
          });
        }
      } else {
        // replace
        ops.push({
          type: DiffOpsTypes.Replace,
          pos: i - 1,
          newToken: targetToken,
        });
      }
      i--;
      j--;
    } else {
      console.table(dp);
      throw new Error(`There was an error at dp[${i}][${j}]`);
    }
  }

  return ops;
}

export function getDiff(sourceDocToken: Tokens.Document, targetDocToken: Tokens.Document): DiffOp[] {
  const ops = getTokensDiff(sourceDocToken.tokens, targetDocToken.tokens);
  return ops;
}
