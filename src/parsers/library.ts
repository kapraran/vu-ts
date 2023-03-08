import RawLibraryFile from "../types/RawLibraryFile";
import { CleanClassFile, defaultParamType, defaultReturnType } from "./common";

export default function (fileData: RawLibraryFile): CleanClassFile {
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
    declareAs: "namespace",
    description: "",
    methods,
    properties: [],
    operators: [],
  };
}
