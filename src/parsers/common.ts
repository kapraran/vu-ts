export interface ParamType {
  name: string;
  type: string;
  nullable: boolean;
  description: string;
  table?: boolean;
  variadic?: boolean;
  default?: any;
}

export const defaultParamType = {
  name: "",
  type: "",
  nullable: false,
  description: "",
  table: false,
  variadic: false,
  default: undefined,
};

export interface ReturnType {
  type: string;
  description: string;
  nullable: boolean;
  array: boolean;
  table: boolean;
}

export const defaultReturnType = {
  type: "",
  description: "",
  nullable: false,
  array: false,
  table: false,
};

export interface CleanCommonFile {
  name: string;
  type: string;
  description: string;
}
