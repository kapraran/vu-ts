import RawLibraryFile from "../types/RawLibraryFile";
import { CleanCommonFile } from "./common";

export interface ReturnType {
  type: string;
  description: string;
  nullable: boolean;
  array: boolean;
  table: boolean;
}

export interface ParamType {
  type: string;
  description: string;
  name: string;
}

export interface MethodType {
  name: string;
  description: string;
  params: ParamType[];
  returns: ReturnType[];
}

export interface CleanLibraryFile extends CleanCommonFile {
  type: "library";
  methods: MethodType[];
}

export default function (fileData: RawLibraryFile): CleanLibraryFile {
  const methods = fileData.methods.map((method) => {
    const returns = [method.returns]
      .filter((v) => !!v)
      .map((v) => ({
        ...{
          type: "",
          nullable: false,
          array: false,
          table: false,
          description: "",
        },
        ...v,
      }));

    const params = Object.entries(method.params || {}).map(([name, value]) => ({
      name,
      description: "",
      ...value,
    }));

    return {
      name: method.name,
      description: method.description || "",
      params,
      returns,
    };
  });

  return {
    name: fileData.name,
    type: fileData.type,
    description: "",
    methods,
  };
}
