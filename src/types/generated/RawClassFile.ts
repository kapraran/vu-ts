export interface RawClassFile {
    name:          string;
    type:          RawClassFileType;
    properties?:   { [key: string]: Property };
    constructors?: Array<Constructor | null>;
    methods?:      Method[];
    operators?:    Operator[];
    static?:       Static;
    inherits?:     string;
    description?:  string;
}

export interface Constructor {
    params?:      ConstructorParams;
    description?: string;
}

export interface ConstructorParams {
    min?:                 Back;
    max?:                 Back;
    data?:                Back;
    eventId?:             Back;
    position?:            Back;
    normal?:              Back;
    speed?:               Back;
    eventName?:           Back;
    other?:               TypeInfo;
    current?:             Back;
    parameter?:           Back;
    guid?:                TypeInfo;
    format?:              Format;
    headers?:             Format;
    timeout?:             Timeout;
    scale?:               Back;
    left?:                Back;
    up?:                  Back;
    forward?:             Back;
    trans?:               Back;
    x?:                   Back;
    y?:                   Back;
    z?:                   Back;
    w?:                   Back;
    eulerAngles?:         Back;
    rotation?:            Back;
    transAndScale?:       Back;
    transform?:           Back;
    player?:              Back;
    extraPlayer?:         Back;
    sendToPlayerOnly?:    Back;
    sendToHostOnly?:      Back;
    sendToTeamOnly?:      Back;
    invertPlayerFilter?:  Back;
    invertTeamFilter?:    Back;
    forwardToSpectators?: Back;
    team?:                Back;
    pos?:                 Back;
    color?:               Back;
    name?:                Back;
}

export interface Back {
    type: string;
}

export interface Format {
    type:        string;
    default:     string;
    description: string;
}

export interface TypeInfo {
    type:         string;
    description?: string;
}

export interface Timeout {
    type:        string;
    description: string;
    default:     number;
}

export interface Method {
    name:         string;
    returns?:     Back[] | ReturnsClass;
    params?:      MethodParams;
    description?: string;
}

export interface MethodParams {
    transform?:                   Back;
    callback?:                    TypeInfo;
    context?:                     TypeInfo;
    handle?:                      Back;
    guid?:                        TypeInfo;
    instance?:                    TypeInfo;
    replacement?:                 TypeInfo;
    replaceReferences?:           ReplaceReferences;
    typeName?:                    TypeInfo;
    other?:                       TypeInfo;
    with?:                        With;
    realm?:                       Back;
    enableAllowed?:               Back;
    isGhost?:                     IsGhost;
    targetData?:                  Back;
    eventId?:                     Back;
    eventName?:                   Back;
    event?:                       Back;
    forData?:                     Back;
    propertyId?:                  Back;
    value?:                       TypeInfo;
    propertyName?:                Back;
    toData?:                      Back;
    fieldId?:                     Back;
    fieldName?:                   Back;
    action?:                      Back;
    level?:                       Back;
    format?:                      Format;
    args?:                        Args;
    returnValue?:                 Back;
    header?:                      TypeInfo;
    camera?:                      Back;
    world?:                       Back;
    hasScale?:                    Back;
    trans?:                       Back;
    target?:                      TypeInfo;
    port?:                        TypeInfo;
    length?:                      TypeInfo;
    data?:                        TypeInfo;
    host?:                        TypeInfo;
    partId?:                      Back;
    atPos?:                       Back;
    mass?:                        Back;
    updateInertia?:               Back;
    deltaTime?:                   Back;
    force?:                       Back;
    position?:                    Back;
    torque?:                      Back;
    to?:                          Back;
    maxDegreesDelta?:             Back;
    t?:                           Back;
    maxDistance?:                 Back;
    entryId?:                     Back;
    input?:                       Input;
    impactNormal?:                Back;
    origin?:                      Back;
    latency?:                     Back;
    damageMultiplier?:            Back;
    externalDamageDirection?:     Back;
    blastAngle?:                  Back;
    fireEnableEvent?:             Back;
    state?:                       Back;
    damageInfo?:                  Back;
    impulseData?:                 Back;
    reason?:                      Back;
    seconds?:                     Back;
    spawnPoint?:                  TypeInfo;
    checkSpawnArea?:              Back;
    slot?:                        Back;
    weaponUnlockAsset?:           Back;
    unlockAssets?:                UnlockAssets;
    characterCustomizationAsset?: Back;
    visualUnlockAssets?:          UnlockAssets;
    miscUnlockAssets?:            UnlockAssets;
    soldierBlueprint?:            Back;
    soldier?:                     Back;
    pose?:                        Back;
    leader?:                      Back;
    squadPrivate?:                Back;
    enable?:                      Back;
    fadeTime?:                    Back;
    fadeToBlack?:                 Back;
    vehicle?:                     Back;
    exitOnEntry?:                 Back;
    customizationData?:           Back;
    immediately?:                 Back;
    overridePending?:             Back;
    weaponSlot?:                  Back;
    team?:                        Back;
    player?:                      Back;
    concept?:                     Back;
    name?:                        Back;
    shooterPlayer?:               Input;
    boneId?:                      Back;
    params?:                      Back;
    index?:                       Back;
}

export interface Args {
    type:     string;
    variadic: boolean;
}

export interface Input {
    type:     string;
    nullable: boolean;
}

export interface IsGhost {
    type:    ReturnsEnum;
    default: boolean;
}

export enum ReturnsEnum {
    Bool = "bool",
    LinearTransform = "LinearTransform",
    Quat = "Quat",
    Vec2 = "Vec2",
    Vec3 = "Vec3",
    Vec4 = "Vec4",
}

export interface UnlockAssets {
    type:  string;
    table: boolean;
}

export interface ReplaceReferences {
    type:        ReturnsEnum;
    description: string;
    default:     boolean;
}

export interface With {
    type:         string;
    nullable?:    boolean;
    description?: string;
}

export interface ReturnsClass {
    type:         string;
    nullable?:    boolean;
    description?: string;
    nestedTable?: boolean;
    table?:       boolean;
}

export interface Operator {
    type:    OperatorType;
    rhs:     string;
    returns: ReturnsEnum;
}

export enum OperatorType {
    Add = "add",
    Div = "div",
    Eq = "eq",
    Lt = "lt",
    Mult = "mult",
    Sub = "sub",
}

export interface Property {
    type:         string;
    nullable?:    boolean;
    readOnly?:    boolean;
    array?:       boolean;
    description?: string;
    table?:       boolean;
    readonly?:    boolean;
    nestedTable?: boolean;
}

export interface Static {
    typeInfo:          TypeInfo;
    down?:             Back;
    left?:             Back;
    negativeInfinity?: Back;
    one?:              Back;
    positiveInfinity?: Back;
    right?:            Back;
    up?:               Back;
    zero?:             Back;
    back?:             Back;
    forward?:          Back;
}

export enum RawClassFileType {
    Class = "class",
}
