export enum LineOps {
  Update,
  Add,
  Remove,
}

export type AddLineOp = {
  type: LineOps.Add;
  addedBuff: string;
}

export type RemoveLineOp = {
  type: LineOps.Remove;
  removedBuff: string;
}

export type UpdateLineOp = {
  type: LineOps.Update;
  preUpdateBuff: string;
  postUpdateBuff: string;
}

export type LineOpType = AddLineOp | RemoveLineOp | UpdateLineOp;

export function addLineOp(addedBuff: string): AddLineOp {
  return {
    type: LineOps.Add,
    addedBuff,
  };
}

export function removeLineOp(removedBuff: string): RemoveLineOp {
  return {
    type: LineOps.Remove,
    removedBuff,
  };
}

export function updateLineOp(preUpdateBuff: string, postUpdateBuff: string): UpdateLineOp {
  return {
    type: LineOps.Update,
    preUpdateBuff,
    postUpdateBuff
  };
}
