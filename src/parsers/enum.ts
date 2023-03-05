import RawEnumFile from "../types/RawEnumFile";

export interface CleanEnumFile {
  name: string;
  type: "enum";
  description?: string;
  values: {
    [name: string]: number;
  };
}

export default function (data: RawEnumFile): CleanEnumFile {
  return {
    name: data.name,
    type: "enum",
    description: data.description,
    values: Object.entries(data.values).reduce(
      (acc, [name, value]) => ({
        ...acc,
        [name]: value.value,
      }),
      {}
    ),
  };
}
