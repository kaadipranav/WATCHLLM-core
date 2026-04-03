declare module 'bcryptjs' {
  export function compare(value: string, hash: string): Promise<boolean>;

  const bcrypt: {
    compare(value: string, hash: string): Promise<boolean>;
  };

  export default bcrypt;
}
