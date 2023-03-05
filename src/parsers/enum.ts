import RawEnumFile from "../types/RawEnumFile";
import { CleanCommonFile } from "./common";

export interface CleanEnumFile extends CleanCommonFile {
  type: "enum";
  values: {
    [name: string]: number;
  };
}

export default function (data: RawEnumFile): CleanEnumFile {
  return {
    name: data.name,
    type: "enum",
    description: data.description || "",
    values: Object.entries(data.values).reduce(
      (acc, [name, value]) => ({
        ...acc,
        [name]: value.value,
      }),
      {}
    ),
  };
}
