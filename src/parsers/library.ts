import RawLibraryFile from "../types/RawLibraryFile";

export default function (fileData: RawLibraryFile) {
  const methods = fileData.methods.map((method) => {
    const returns = [method.returns].filter((v) => !!v);

    const params = Object.entries(method.params || {}).map(([name, value]) => ({
      name,
      ...value,
    }));

    return {
      name: method.name,
      descritpion: method.description,
      params,
      returns,
    };
  });

  return {
    name: fileData.name,
    type: fileData.type,
    methods,
  };
}
