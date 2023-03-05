export type FunctionRequest<FunctionNames> = {
  uid: string;
  function_type: FunctionNames;
  args: Array<any>;
};

export type FunctionResponse = {
  uid: string;
  success: boolean;
  error?: string;
  result: any;
};
