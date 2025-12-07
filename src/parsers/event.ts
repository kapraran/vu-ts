// Use generated types from quicktype
import type { RawEventFile } from "../types/generated/RawEventFile";
import { CleanCommonFile, defaultParamType, ParamType } from "./common";

export interface CleanEventFile extends CleanCommonFile {
  type: "event";
  params: ParamType[];
}

export default function (data: RawEventFile): CleanEventFile {
  return {
    name: data.name,
    type: "event",
    description: data.description || "",
    params: Object.entries(data.params || {}).map(([name, param]) => {
      return {
        ...defaultParamType,
        name,
        ...param,
      };
    }),
  };
}
