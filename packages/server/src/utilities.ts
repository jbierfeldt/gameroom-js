export const createID = function (length: number): string {
  if (!length) {
    length = 8;
  }
  let str = "";
  for (let i = 1; i < length + 1; i = i + 8) {
    str += Math.random().toString(36).substring(2, 10);
  }
  return str.substring(0, length).toUpperCase();
};
