export default interface RawEnumFile {
  name: string;
  type: "enum";
  description?: string;
  values: { [name: string]: { value: number } };
}
