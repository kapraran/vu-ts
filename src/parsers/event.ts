import RawEventFile from "../types/RawEventFile";
import { CleanCommonFile } from "./common";

interface ParamType {
  name: string;
  type: string;
  nullable: boolean;
}

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
        name,
        nullable: false,
        ...param,
      };
    }),
  };
}
