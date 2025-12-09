declare namespace json {
  export function encode(data: {}): string;
  export function decode(data: string): {};
}

declare class vector<T> extends LuaIterable<T> {
  add(value: T): void;
  insert(index: number, value: T): void;
  erase(index: number): void;
  clear(): void;
  index_of(value: T): number;
}
