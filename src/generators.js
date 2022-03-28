function toType(luaType) {
  if (luaType === "nil") return "undefined";
  // if (luaType === "table") return "object";
  if (luaType === "table") return "LuaTable";

  if (luaType === "int") return "number";
  if (luaType === "float") return "number";

  if (luaType === "bool") return "boolean";

  return luaType;
}

const opMapping = {
  add: "LuaAdditionMethod",
  sub: "LuaSubtractionMethod",
  mult: "LuaMultiplicationMethod",
  div: "LuaDivisionMethod",
  lt: "LuaLessThanMethod",
};

function genReturns({ type, params, nullable, array, variadic, table }) {
  const _t = toType(type);
  const typePart = table ? `LuaTable<number, ${_t}>` : _t;
  const bracketsPart = array || variadic ? "[]" : "";
  const undefinedPart = nullable ? " | undefined" : "";

  return `${typePart} ${bracketsPart} ${undefinedPart}`;
}

function genTypedVar([name, returns]) {
  const ellipsisPart = returns.variadic ? "..." : "";
  return `${ellipsisPart}${name}: ${genReturns(returns)}`;
}

function genClass(d) {
  const className = d.isLibrary ? `__${d.name}` : d.name;

  return `declare class ${className} ${
    d.inherits ? `extends ${d.inherits}` : ""
  } {
    ${d.static.map(genStaticProperties).join("\n")}

    ${d.properties.map(genClassProp).join("\n")}

    ${d.constructors.map(genClassConstructor).join("\n")}

    ${d.methods.map(genClassMethod).join("\n")}

    ${genClassOperators(d.operators)}
  }

  ${d.isLibrary ? `declare const ${d.name}: ${className}` : ""}
  `;
}

function genClassOperators(operators) {
  if ((operators || []).length < 1) return "";

  const groupByType = operators.reduce((acc, item) => {
    if (acc[item.type] === undefined) acc[item.type] = [];

    acc[item.type].push(item);
    return acc;
  }, {});

  return Object.entries(groupByType).map(genClassOperator1).join("\n");
}

function genClassOperator1([name, overloads]) {
  const unionType = overloads
    .map(genClassOperator)
    .filter((o) => o !== undefined && o.trim().length > 0)
    .join(" | ");

  return unionType.length > 0 ? `${name}: ${unionType}` : "";
}

function genClassOperator({ type, rhs, returns }) {
  const returnType = returns ? toType(returns) : "void";

  if (opMapping[type] !== undefined) {
    return `${opMapping[type]}<${toType(rhs)}, ${returnType}>`;
  }

  console.warn(`op mappping not found: ${type}`);
  return undefined;
}

function genClassMethod({ name, params, returns }) {
  const returnPart = `: ${returns ? genReturns(returns) : "void"}`;
  const hasReturnPart = name !== "constructor";

  return `${name}(${genMethodParams(params)}) ${
    hasReturnPart ? returnPart : ""
  };`;
}

function genMethodParams(params) {
  if (params === undefined) return "";

  return params.map(genMethodParam).join(", ");
}

const replParamName = ["default", "with"];
function genMethodParam([
  name,
  { type, params, nullable, array, variadic, table },
]) {
  if (replParamName.includes(name)) {
    name = `_${name}`;
  }

  if (type === "callable") {
    return genCallable([name, { type, params }]);
  }

  return genTypedVar([
    name,
    { type, params, nullable, array, variadic, table },
  ]);
}

function genCallable([name, { type, params }]) {
  return `${name}: (${genMethodParams(params)}) => void`;
}

function genClassProp([name, returns]) {
  return `${returns.readOnly ? "readonly" : ""} ${name}: ${genReturns(
    returns
  )}`;
}

function genStaticProperties([name, { type }]) {
  return `static ${name}: ${type}`;
}

function genClassConstructor({ params }) {
  return genClassMethod({
    name: "constructor",
    params: Object.entries(params || {}),
  });
}

function genEnum({ name, values }) {
  const entries = Object.entries(values);

  return `declare enum ${name} {
    ${entries.map(([name, { value }]) => `${name}= ${value}`).join(", ")}
  }`;
}

module.exports = {
  genClassMethod,
  genMethodParams,
  genMethodParam,
  genClassProp,
  genClassOperator,
  genStaticProperties,
  genClassConstructor,
  genClass,
  genEnum,
};
