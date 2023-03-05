export default interface RawEventFile {
  name: string;
  type: "event";
  description?: string;
  params?: {
    [name: string]: {
      type: string;
      nullable?: boolean;
    };
  };
}
