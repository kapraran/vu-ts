import RawLibraryFile from "../types/RawLibraryFile";
import {
  CleanCommonFile,
  defaultParamType,
  defaultReturnType,
  ParamType,
  ReturnType,
} from "./common";

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
        ...defaultReturnType,
        ...v,
      }));

    const params = Object.entries(method.params || {}).map(([name, value]) => ({
      ...defaultParamType,
      name,
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
