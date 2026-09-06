import { teardown } from "./helpers";

export default async function globalTeardown() {
  await teardown();
}
