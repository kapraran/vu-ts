import RawHookFile from "../types/RawHookFile";
import {
  CleanCommonFile,
  defaultParamType,
  defaultReturnType,
  ParamType,
  ReturnType,
} from "./common";

export interface CleanHookFile extends CleanCommonFile {
  type: "hook";
  params: ParamType[];
  returns?: ReturnType;
}

export default function (data: RawHookFile): CleanHookFile {
  return {
    name: data.name,
    type: "hook",
    description: "",
    params: Object.entries(data.params || {}).map(([name, param]) => {
      return {
        ...defaultParamType,
        name,
        ...param,
      };
    }),
    returns: data.returns
      ? {
          ...defaultReturnType,
          ...data.returns,
        }
      : undefined,
  };
}
