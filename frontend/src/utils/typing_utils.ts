export const unwrap = <T>(x: T | undefined | null): T => {
  if (x == null) {
    throw new Error("expected non-null value");
  }
  return x;
};
