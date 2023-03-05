export default interface RawHookFile {
  name: string;
  type: "hook";
  returns?: {
    type: string;
    nullable?: boolean;
  };
  params?: {
    [name: string]: {
      type: string;
      readOnly?: boolean;
      table?: boolean;
    };
  };
}
