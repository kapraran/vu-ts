export default interface RawClassFile {
  name: string;
  type: "class";
  inherits?: string;
  description?: string;
  properties?: {
    [name: string]: {
      type: string;
      description?: string;
      readOnly?: boolean;
      nullable?: boolean;
      table?: boolean;
    };
  };
  constructors?: {
    params?: {
      [name: string]: {
        type: string;
        description?: string;
        default?: any;
      };
    };
    description?: string;
  }[];
  methods?: {
    name: string;
    description?: string;
    params?: {
      [name: string]: {
        type: string;
        description?: string;
        table?: boolean;
        nullable?: boolean;
        variadic?: boolean;
        default?: any;
      };
    };
    returns?:
      | {
          type: string;
          nullable?: boolean;
          table?: boolean;
          description?: string;
        }
      | {
          type: string;
          nullable?: boolean;
          table?: boolean;
          description?: string;
        }[];
  }[];
  operators?: {
    type: "add" | "sub" | "mult" | "div" | "eq" | "lt";
    rhs: string;
    returns: string;
  }[];
  static?: {
    [name: string]: {
      type: string;
      description?: string;
    };
  };
}
