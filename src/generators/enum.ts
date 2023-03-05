import { CleanEnumFile } from "../parsers/enum";

export default function (data: CleanEnumFile) {
  return `

  declare enum ${data.name} {
    ${Object.entries(data.values)
      .map(([name, value]) => `${name} = ${value}`)
      .join(",\n")}
  }
  
  `;
}
