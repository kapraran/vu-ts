// declare interface YamlData {
//   name: string; // done
//   type: string; // done
//   description?: string; // done
//   inherits?: string; // done
//   constructors?: (Constructor | null)[]; // done
//   properties?: Record<string, Prop>; // done
//   methods?: Method[]; // done
//   static?: Record<string, Param>; // done
//   operators?: OperatorType[]; // done
//   values?: Record<string, ValueType>; // done
// }

declare namespace RawYaml {
  // interface ReturnType {
  //   type: string;
  //   description?: string;
  //   table?: boolean;
  //   nullable?: boolean;
  // }

  // interface DataMethod {
  //   name: string;
  //   params: string[];
  //   returns: ReturnType | ReturnType[];
  //   example?: string;
  // }

  // interface DataFileCommon {
  //   name: string;
  //   type: string;
  // }

  // interface DataFileLibrary extends DataFileCommon {
  //   type: "library";
  //   methods: DataMethod[];
  // }

  interface LibraryFile {
    name: string;
    type: "library";
    methods: {
      name: string;
      description?: string;
      returns: {
        type: string;
        nullable: boolean;
        array: boolean;
        table: boolean;
        description?: string;
      }[];
      params: {
        type: string;
        description?: string;
      }[];
    };
  }
}
