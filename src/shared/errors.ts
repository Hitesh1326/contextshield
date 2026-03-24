export class ScrubError extends Error {
  public override readonly name = "ScrubError";
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export class ModelError extends Error {
  public override readonly name = "ModelError";
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export class ChatDetectionError extends Error {
  public override readonly name = "ChatDetectionError";
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}
