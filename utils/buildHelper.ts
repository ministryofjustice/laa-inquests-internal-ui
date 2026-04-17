import fs from "node:fs";

const RANDOM_NUMBER_UPPER_BOUND = 10000;
const FIRST_IN_ARRAY = 0;

export const getBuildNumber = (): string =>
  Math.floor(Math.random() * RANDOM_NUMBER_UPPER_BOUND).toString();

export const getLatestBuildFile = (
  directory: string,
  prefix: string,
  extension: string,
): string => {
  const files = fs.readdirSync(directory);
  const pattern = new RegExp(`^${prefix}\\.\\d+\\.${extension}$`, "v");
  const matchingFiles = files.filter((file) => pattern.test(file));
  return matchingFiles.length > FIRST_IN_ARRAY
    ? matchingFiles[FIRST_IN_ARRAY]
    : "";
};
