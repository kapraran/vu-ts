declare namespace json {
  export function encode(data: {}): string;
  export function decode<T>(data: string): T;
}

declare interface vector<T> extends LuaIterable<T> {
  [index: number]: T;
  size: LuaLengthMethod<number>;
  add(value: T): void;
  insert(index: number, value: T): void;
  erase(index: number): void;
  clear(): void;
  index_of(value: T): number;
}
