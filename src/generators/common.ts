export function fixTypeName(name: string) {
  const typeMap = {
    bool: "boolean",
    int: "number",
    callable: "(...args:any) => any",
    float: "number",
    table: "LuaTable<string, any>",
  };

  return typeMap[name] || name;
}

export function fixParamName(name: string) {
  const blacklist = ["default"];

  return blacklist.includes(name) ? `_${name}` : name;
}

export function generateFunction() {}
