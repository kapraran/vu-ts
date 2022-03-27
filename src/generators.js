function toType(luaType) {
  if (luaType === "nil") return "undefined";
  if (luaType === "table") return "object";

  if (luaType === "int") return "number";
  if (luaType === "float") return "number";

  if (luaType === "bool") return "boolean";

  return luaType;
}

function genClassOperator({ type, rhs, returns }) {
  const returnType = returns ? toType(returns) : "void";

  if (type === "add") {
    return `add: LuaAdditionMethod<${rhs}, ${returnType}>`;
  }

  if (type === "sub") {
    return `sub: LuaSubtractionMethod<${rhs}, ${returnType}>`;
  }

  if (type === "mult") {
    return `mult: LuaMultiplicationMethod<${rhs}, ${returnType}>`;
  }

  if (type === "div") {
    return `div: LuaDivisionMethod<${rhs}, ${returnType}>`;
  }
}

function genClassMethod({ name, params, returns }) {
  const returnType = returns ? toType(returns.type) : "void";
  const returnPart = `: ${returnType}`;
  const hasReturnPart = name !== "constructor";

  return `${name}(${genMethodParams(params)}) ${
    hasReturnPart ? returnPart : ""
  };`;
}

function genMethodParams(params) {
  if (params === undefined) return "";

  return Object.entries(params).map(genMethodParam).join(", ");
}

const replParamName = ["default", "with"];
function genMethodParam([name, { type }]) {
  if (replParamName.includes(name)) {
    name = `_${name}`;
  }

  return `${name}: ${toType(type)}`;
}

function genClassProp([name, { type, description, readOnly }]) {
  return `${readOnly ? "readonly" : ""} ${name}: ${toType(type)}`;
}

function genStaticProperties([name, { type }]) {
  return `static ${name}: ${type}`;
}

function genClassConstructor({ params }) {
  return genClassMethod({ name: "constructor", params });
}

module.exports = {
  genClassMethod,
  genMethodParams,
  genMethodParam,
  genClassProp,
  genClassOperator,
  genStaticProperties,
  genClassConstructor,
};
