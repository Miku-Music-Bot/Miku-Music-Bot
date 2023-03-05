export type FunctionRequest<FunctionNames> = {
  uid: string;
  function_type: FunctionNames;
  args: Array<string>;
};

export type FunctionResponse = {
  uid: string;
  success: boolean;
  error?: string;
  result: string;
};
