export default interface RawLibraryFile {
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
    };
    params: Record<
      string,
      {
        type: string;
        description?: string;
      }
    >;
  }[];
}
