import { readFile } from "fs/promises";
const json = JSON.parse(await readFile("./config.json"));
export default json;
