import {
  CleanClassFile,
  MethodType,
  OperatorType,
  PropType,
  ReturnType,
} from "../parsers/common";
import { fixTypeName } from "./common";

const opMapping = {
  add: "LuaAdditionMethod",
  sub: "LuaSubtractionMethod",
  mult: "LuaMultiplicationMethod",
  div: "LuaDivisionMethod",
  lt: "LuaLessThanMethod",
};

function sortMethods(a: MethodType, b: MethodType) {
  return a.name > b.name ? 1 : -1;
}

function generateReturnsCode(m: MethodType) {
  if (m.name === "constructor") return "";
  if (m.returns.length === 0) return ": void";

  const returnsStr = m.returns
    .map((r) => [
      r,
      `${fixTypeName(r.type)} ${r.array ? "[]" : ""} ${
        r.nullable ? "| null" : ""
      }`,
    ])
    .map(([r, rstr]) => ((r as ReturnType).table ? `LuaTable<${rstr}>` : rstr))
    .join(", ");

  return (
    ":" +
    (m.returns.length > 1 ? `LuaMultiReturn<[${returnsStr}]>` : returnsStr)
  );
}

function generatePropertyCode(p: PropType) {
  return `${p.static ? "static" : ""} ${p.readOnly ? "readonly" : ""} ${
    p.name
  }: ${fixTypeName(p.type)} ${p.table ? "[]" : ""}${
    p.nullable ? "| null" : ""
  }`;
}

function generateOperatorCode(op: OperatorType, data: CleanClassFile) {
  return `${op.type}: ${opMapping[op.type]}<${data.name}, ${fixTypeName(
    op.rhs
  )}>`;
}

function generateMethodCode(m: MethodType, data: CleanClassFile) {
  return `${data.declareAs === "namespace" ? "function" : ""}  ${
    m.name
  }() ${generateReturnsCode(m)}`;
}

export default function (data: CleanClassFile) {
  return `

  declare ${data.declareAs} ${data.name} ${
    data.inherits ? `extends ${data.inherits}` : ""
  } {

    ${data.properties.map(generatePropertyCode).join(";\n")}

    ${data.methods
      .sort(sortMethods)
      .map((m) => generateMethodCode(m, data))
      .join(";\n")}

      // data.operators.map((op) => generateOperatorCode(op, data))
  }
  
  `;
}
