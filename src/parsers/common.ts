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

export interface OperatorType {
  type: "add" | "sub" | "mult" | "div" | "eq" | "lt";
  rhs: string;
  returns: string;
}

export interface PropType {
  name: string;
  type: string;
  description: string;
  readOnly: boolean;
  nullable: boolean;
  table: boolean;
  static: boolean;
}

export const defaultPropType = {
  name: "",
  type: "",
  description: "",
  readOnly: false,
  nullable: false,
  table: false,
  static: false,
};

export interface MethodType {
  name: string;
  description: string;
  params: ParamType[];
  returns: ReturnType[];
}

export interface CleanClassFile extends CleanCommonFile {
  declareAs: "class" | "namespace";
  inherits?: string;
  properties: PropType[];
  operators: OperatorType[];
  methods: MethodType[];
}
