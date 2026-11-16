import "server-only";
import { cache } from "react";
import { getRegistryData } from "./data";

/** Per-request memoised registry fetch, shared by the public layout and pages. */
export const getRegistry = cache(getRegistryData);
