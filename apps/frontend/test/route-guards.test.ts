import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { AuthContext, type AuthState, type AuthStatus } from "../src/context/auth-context";
import { RequireAuth } from "../src/router/route-guards";

function renderGuard(status: AuthStatus, path = "/admin/attendance/live") {
  let protectedRendered = false;
  function ProtectedPage() {
    protectedRendered = true;
    return createElement("div", null, "private attendance records");
  }
  const auth: AuthState = {
    status, me: null, activeOrganization: null,
    setActiveOrganization() {},
    async login() { throw new Error("Not used"); },
    async register() { throw new Error("Not used"); },
    async ownerSignIn() { throw new Error("Not used"); },
    async logout() {},
    async reload() { return null; },
  };
  const markup = renderToStaticMarkup(createElement(AuthContext.Provider, { value: auth },
    createElement(MemoryRouter, { initialEntries: [path] },
      createElement(RequireAuth, { children: createElement(ProtectedPage) }))));
  return { markup, protectedRendered };
}

test("refreshing an admin route shows the public layout while keeping protected content unmounted", () => {
  const { markup, protectedRendered } = renderGuard("loading");
  assert.match(markup, /Attendance register/);
  assert.match(markup, /Admin navigation/);
  assert.match(markup, /aria-busy="true"/);
  assert.doesNotMatch(markup, /Checking your session|private attendance records/);
  assert.equal(protectedRendered, false);
});

test("anonymous users cannot render a protected page", () => {
  assert.equal(renderGuard("anonymous").protectedRendered, false);
});

test("verified users can render their protected page", () => {
  assert.equal(renderGuard("authenticated").protectedRendered, true);
});
