import RawClassFile from "../types/RawClassFile";
import {
  CleanCommonFile,
  defaultParamType,
  defaultReturnType,
  ParamType,
  ReturnType,
} from "./common";

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
  type: "class";
  inherits?: string;
  properties: PropType[];
  operators: OperatorType[];
  methods: MethodType[];
}

export default function (data: RawClassFile): CleanClassFile {
  const properties = Object.entries(data.properties || {}).map(
    ([name, props]) => ({
      ...defaultPropType,
      name,
      ...props,
    })
  );

  const _static = Object.entries(data.static || {}).map(([name, props]) => ({
    ...defaultPropType,
    name,
    ...props,
    static: true,
  }));

  const methods = (data.methods || []).map((method) => {
    const params = Object.entries(method.params || {}).map(([name, value]) => ({
      ...defaultParamType,
      name,
      ...value,
    }));

    const rawReturns = Array.isArray(method.returns)
      ? method.returns
      : [method.returns];

    const returns = rawReturns
      .filter((v) => !!v)
      .map((r) => ({
        ...defaultReturnType,
        ...r,
      }));

    return {
      name: method.name,
      description: method.description || "",
      params,
      returns,
    };
  });

  const constructors = (data.constructors || []).map((constructor) => {
    const params = Object.entries(constructor.params || {}).map(
      ([name, value]) => ({
        ...defaultParamType,
        name,
        ...value,
      })
    );

    return {
      name: "constructor",
      description: constructor.description || "",
      params,
      returns: [],
    };
  });

  return {
    name: data.name,
    type: "class",
    description: data.description || "",
    properties: properties.concat(_static),
    operators: data.operators || [],
    methods: methods.concat(constructors),
  };
}
