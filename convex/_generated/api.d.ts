/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as authInternal from "../authInternal.js";
import type * as dashboard from "../dashboard.js";
import type * as deliveries from "../deliveries.js";
import type * as inventory from "../inventory.js";
import type * as lib from "../lib.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as publicData from "../publicData.js";
import type * as requests from "../requests.js";
import type * as seedDemo from "../seedDemo.js";
import type * as seedInternal from "../seedInternal.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  authInternal: typeof authInternal;
  dashboard: typeof dashboard;
  deliveries: typeof deliveries;
  inventory: typeof inventory;
  lib: typeof lib;
  messages: typeof messages;
  notifications: typeof notifications;
  publicData: typeof publicData;
  requests: typeof requests;
  seedDemo: typeof seedDemo;
  seedInternal: typeof seedInternal;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
