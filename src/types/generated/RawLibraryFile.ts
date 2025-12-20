export interface RawLibraryFile {
  name: string;
  type: RawLibraryFileType;
  methods: Method[];
}

export interface Method {
  name: string;
  params?: Params;
  returns?: Returns;
  description?: string;
  example?: string;
}

export interface Params {
  entityType?: A;
  entityData?: A;
  transform?: A;
  params?: A;
  blueprint?: A;
  callback?: Callback;
  context?: Callback;
  eventName?: A;
  args?: Args;
  hookName?: A;
  priority?: A;
  from?: A;
  to?: A;
  up?: A;
  left?: A;
  forward?: A;
  yaw?: A;
  pitch?: A;
  roll?: A;
  a?: A;
  b?: A;
  value?: A;
  min?: A;
  max?: A;
  text?: A;
  t?: A;
  url?: A;
  options?: A;
  data?: A;
  family?: A;
  type?: A;
  superbundle?: A;
  mediaHint?: MediaHint;
  optional?: Optional;
  settingsType?: A;
  compartment?: A;
  name?: Callback;
  partitionGuid?: A;
  instanceGuid?: A;
  instance?: A;
  registry?: A;
  bundles?: Bundles;
  handle?: A;
  parent?: A;
  clientOnly?: A;
  enable?: A;
  table?: A;
  message?: Callback;
  toTeam?: A;
  toSquad?: A;
  toPlayer?: A;
  toPlayers?: Bundles;
  duration?: A;
  player?: A;
  id?: A;
  onlineId?: A;
  guid?: A;
  team?: A;
  squad?: A;
  enabled?: A;
  fadeTime?: A;
  maxHits?: A;
  materialFlags?: A;
  flags?: A;
  latency?: A;
  command?: A;
  event?: A;
  query?: A;
  ticketCount?: A;
  channelName?: A;
  defaultEmitterType?: Callback;
  worldPos?: A;
  mousePos?: A;
  graphAsset?: Callback;
  screensToPop?: Callback;
  serverGuid?: Callback;
  password?: Password;
  shouldJoinSquad?: A;
  description?: A;
  colorFrom?: A;
  colorTo?: A;
  pos1?: A;
  pos2?: A;
  pos3?: A;
  color1?: A;
  color2?: A;
  color3?: A;
  pos?: A;
  radius?: A;
  color?: A;
  renderLines?: A;
  smallSizeSegmentDecrease?: A;
  x?: A;
  y?: A;
  scale?: A;
  vertices?: Bundles;
  aabb?: A;
  asset?: A;
  firstPersonEffect?: A;
  disableTimer?: A;
  concept?: A;
  key?: A;
  button?: A;
  axes?: A;
  sensitivity?: A;
  distance?: A;
  default?: Default;
  minLength?: A;
  maxLength?: A;
  optionNames?: Bundles;
  allowEmpty?: A;
  spectating?: A;
  firstPerson?: A;
  mode?: A;
  dirty?: A;
  rotation?: A;
  state?: A;
  script?: A;
  string?: A;
}

export interface A {
  type: string;
}

export interface Args {
  type: ArgsType;
  variadic?: boolean;
  table?: boolean;
}

export enum ArgsType {
  Any = "any",
  Callable = "callable",
  DataContainer = "DataContainer",
  GUID = "Guid",
  Int = "int",
  String = "string",
  VoipEmitterType = "VoipEmitterType",
}

export interface Bundles {
  type: string;
  table: boolean;
}

export interface Callback {
  type: ArgsType;
  description?: string;
}

export interface Default {
  type: string;
  table?: boolean;
  nullable?: boolean;
}

export interface MediaHint {
  type: string;
  default: string;
}

export interface Optional {
  type: string;
  default: boolean;
}

export interface Password {
  type: ArgsType;
  description: string;
  default: string;
}

export interface Returns {
  type: string;
  nullable?: boolean;
  table?: boolean;
  array?: boolean;
  description?: string;
}

export enum RawLibraryFileType {
  Library = "library",
}
