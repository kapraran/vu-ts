import { fixParamName, fixTypeName } from "./common";

function generateReturnType(returns: ReturnType[]) {
  const retStr = returns
    .map(
      (ret) =>
        `${fixTypeName(ret.type)} ${ret.array ? "[]" : ""} ${
          ret.table ? "{}" : ""
        } ${ret.nullable ? "| null" : ""}`
    )
    .join(",");
  return retStr.length > 0 ? retStr : "void";
}

export default function (data: CleanLibraryFile) {
  return `

  declare namespace ${data.name} {
    ${data.methods
      .map(
        (method) => `
      function ${method.name} (${method.params
          .map(
            (param) => `${fixParamName(param.name)}: ${fixTypeName(param.type)}`
          )
          .join(",")}): ${generateReturnType(method.returns)};
    `
      )
      .join("\n")}
  }
  
  `;
}
