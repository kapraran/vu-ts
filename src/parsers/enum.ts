// Use generated types from quicktype
import type { RawEnumFile } from "../types/generated/RawEnumFile";
import { CleanCommonFile } from "./common";

export interface CleanEnumFile extends CleanCommonFile {
  type: "enum";
  values: {
    [name: string]: number;
  };
}

export default function (data: RawEnumFile): CleanEnumFile {
  // Handle both generated type (which may have values as { value: number }) 
  // and direct number values
  const values = Object.entries(data.values).reduce(
    (acc, [name, value]) => ({
      ...acc,
      [name]: typeof value === "object" && "value" in value ? value.value : value,
    }),
    {} as { [name: string]: number }
  );

  return {
    name: data.name,
    type: "enum",
    description: data.description || "",
    values,
  };
}
