export interface RawEventFile {
  name: string;
  type: RawEventFileType;
  params?: Params;
  description?: string;
}

export interface Params {
  message?: AccountGUID;
  deltaTime?: AccountGUID;
  simulationDeltaTime?: AccountGUID;
  gunSway?: AccountGUID;
  weapon?: Entity;
  weaponFiring?: Entity;
  screenInfo?: AccountGUID;
  levelName?: AccountGUID;
  gameMode?: AccountGUID;
  isDedicatedServer?: AccountGUID;
  levelData?: AccountGUID;
  partition?: AccountGUID;
  compartment?: AccountGUID;
  updatePass?: AccountGUID;
  entity?: Entity;
  capturePoint?: AccountGUID;
  player?: Entity;
  round?: AccountGUID;
  roundsPerMap?: AccountGUID;
  lifeCounter?: AccountGUID;
  isFinalBase?: AccountGUID;
  recipientMask?: AccountGUID;
  name?: AccountGUID;
  playerGuid?: AccountGUID;
  ipAddress?: AccountGUID;
  accountGuid?: AccountGUID;
  squad?: AccountGUID;
  inflictor?: Entity;
  position?: AccountGUID;
  isRoadKill?: AccountGUID;
  isHeadShot?: AccountGUID;
  wasVictimInReviveState?: AccountGUID;
  info?: Entity;
  newCustomization?: AccountGUID;
  reviver?: Entity;
  isAdrenalineRevive?: AccountGUID;
  weaponName?: AccountGUID;
  givenMagsCount?: AccountGUID;
  supplier?: Supplier;
  scoringTypeData?: AccountGUID;
  score?: AccountGUID;
  vehicle?: AccountGUID;
  playerToSpawnOn?: AccountGUID;
  spawnEntity?: AccountGUID;
  oldSquad?: AccountGUID;
  enemy?: AccountGUID;
  team?: AccountGUID;
  oldTeam?: AccountGUID;
  objectPlayer?: Entity;
  statEvent?: AccountGUID;
  paramX?: Entity;
  paramY?: Entity;
  value?: AccountGUID;
  roundTime?: AccountGUID;
  winningTeam?: AccountGUID;
  soldier?: AccountGUID;
  action?: AccountGUID;
  damage?: AccountGUID;
  vehiclePoints?: AccountGUID;
  hotTeam?: AccountGUID;
  hasFriend?: AccountGUID;
  hasEnemy?: AccountGUID;
  hasVehicle?: AccountGUID;
  hasSoldier?: AccountGUID;
  oldSlot?: AccountGUID;
  newSlot?: AccountGUID;
  playerTriggeredSwitch?: AccountGUID;
  quickSwitch?: AccountGUID;
  automaticSwitchBack?: AccountGUID;
  state?: AccountGUID;
  channel?: AccountGUID;
  emitter?: AccountGUID;
  isEmitting?: AccountGUID;
}

export interface AccountGUID {
  type: string;
}

export interface Entity {
  type: EntityType;
  nullable?: boolean;
}

export enum EntityType {
  DamageGiverInfo = "DamageGiverInfo",
  DataContainer = "DataContainer",
  Entity = "Entity",
  Player = "Player",
  String = "string",
  WeaponFiring = "WeaponFiring",
}

export interface Supplier {
  type: EntityType;
  nullable: string;
}

export enum RawEventFileType {
  Event = "event",
}
