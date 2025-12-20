export interface RawHookFile {
  name: string;
  type: Type;
  params?: Params;
  returns?: Returns;
}

export interface Params {
  entity?: AccountGUID;
  shouldCollideWith?: Action;
  bundles?: Bundles;
  compartment?: Action;
  assetName?: AccountGUID;
  hit?: Action;
  giverInfo?: GiverInfo;
  entityData?: Action;
  transform?: Action;
  blueprint?: Action;
  variation?: Action;
  parentRepresentative?: Returns;
  player?: AccountGUID;
  joinMode?: JoinMode;
  accountGuid?: AccountGUID;
  playerGuid?: AccountGUID;
  playerName?: AccountGUID;
  team?: Action;
  suppressionModifier?: Action;
  soldier?: AccountGUID;
  info?: Action;
  shooter?: GiverInfo;
  message?: Action;
  playerId?: Action;
  recipientMask?: Action;
  channelId?: Action;
  isSenderDead?: Action;
  cache?: Action;
  deltaTime?: Action;
  action?: Action;
  victim?: Action;
  weapon?: Returns;
  isHeadshot?: Action;
  victimId?: Action;
  killerId?: Action;
  killer?: Action;
  enable?: Action;
  cursor?: Action;
  eventType?: Action;
  screen?: AccountGUID;
  priority?: Action;
  parentGraph?: AccountGUID;
  stateNodeGuid?: Returns;
}

export interface AccountGUID {
  type: string;
  readOnly?: boolean;
}

export interface Action {
  type: string;
}

export interface Bundles {
  type: string;
  table: boolean;
}

export interface GiverInfo {
  type: string;
  readOnly: boolean;
  nullable?: boolean;
}

export interface JoinMode {
  type: string;
  readOnly: boolean;
  description: string;
}

export interface Returns {
  type: string;
  nullable?: boolean;
}

export enum Type {
  Hook = "hook",
}
