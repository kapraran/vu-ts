export interface RawEnumFile {
    name:         string;
    type:         Type;
    values:       { [key: string]: Value };
    description?: string;
}

export enum Type {
    Enum = "enum",
}

export interface Value {
    value:        number;
    description?: string;
}
