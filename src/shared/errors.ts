export class ContextShieldError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContextShieldError";
  }
}
