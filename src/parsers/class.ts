// Use generated types from quicktype
import type { RawClassFile } from "../types/generated/RawClassFile";
import {
  CleanClassFile,
  defaultParamType,
  defaultPropType,
  defaultReturnType,
} from "./common";

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
    const params = Object.entries(constructor?.params || {}).map(
      ([name, value]) => ({
        ...defaultParamType,
        name,
        ...value,
      })
    );

    return {
      name: "constructor",
      description: constructor?.description || "",
      params,
      returns: [],
    };
  });

  return {
    name: data.name,
    type: "class",
    declareAs: "class",
    description: data.description || "",
    inherits: data.inherits,
    properties: properties.concat(_static),
    operators: data.operators || [],
    methods: methods.concat(constructors),
  };
}
