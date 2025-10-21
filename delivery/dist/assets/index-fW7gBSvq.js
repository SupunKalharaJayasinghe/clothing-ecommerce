(function () {
  const a = document.createElement("link").relList;
  if (a && a.supports && a.supports("modulepreload")) return;

  for (const n of document.querySelectorAll('link[rel="modulepreload"]')) s(n);

  new MutationObserver(n => {
    for (const o of n)
      if (o.type === "childList")
        for (const l of o.addedNodes)
          l.tagName === "LINK" && l.rel === "modulepreload" && s(l);
  }).observe(document, { childList: !0, subtree: !0 });

  function i(n) {
    const o = {};
    if (n.integrity) o.integrity = n.integrity;
    if (n.referrerPolicy) o.referrerPolicy = n.referrerPolicy;
    if (n.crossOrigin === "use-credentials") o.credentials = "include";
    else if (n.crossOrigin === "anonymous") o.credentials = "omit";
    else o.credentials = "same-origin";
    return o;
  }

  function s(n) {
    if (n.ep) return;
    n.ep = !0;
    const o = i(n);
    fetch(n.href, o);
  }
})();

const S = window.DELIVERY_API_BASE || "http://localhost:4000/api";

function C(t) {
  return document.cookie
    .split("; ")
    .map(a => a.split("="))
    .reduce(
      (a, [i, s]) => ({
        ...a,
        [decodeURIComponent(i)]: decodeURIComponent(s || "")
      }),
      {}
    )[t];
}

async function m(t, { method: a = "GET", body: i, headers: s = {} } = {}) {
  const n = {
    method: a,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(a !== "GET" && a !== "HEAD"
        ? { "x-csrf-token": C("csrf_token") || "" }
        : {}),
      ...s
    }
  };
  if (i !== void 0) n.body = JSON.stringify(i);
  const o = await fetch(`${S}${t}`, n);
  const d = (o.headers.get("content-type") || "").includes("application/json")
    ? await o.json()
    : await o.text();
  if (!o.ok) {
    const u = (d == null ? void 0 : d.message) || o.statusText;
    throw new Error(u);
  }
  return d;
}

const c = {
  me: () => m("/delivery/auth/me"),
  login: (t, a) => m("/delivery/auth/login", { method: "POST", body: { identifier: t, password: a } }),
  register: t => m("/delivery/auth/register", { method: "POST", body: t }),
  logout: () => m("/delivery/auth/logout", { method: "POST" }),
  listOrders: (t, a) =>
    m(
      `/delivery/orders${[t ? `status=${encodeURIComponent(t)}` : "", a ? `method=${encodeURIComponent(a)}` : ""]
        .filter(Boolean)
        .map((i, s) => (s === 0 ? "?" : "&") + i)
        .join("")}`
    ),
  setOrderStatus: (t, a, i) =>
    m(`/delivery/orders/${t}/status`, { method: "PATCH", body: { status: a, ...(i || {}) } }),
  setCodPayment: (t, a) =>
    m(`/delivery/cod/${t}/payment`, { method: "PATCH", body: { action: a } })
};

const v = document.getElementById("app-root");

function e(t, a = {}, ...i) {
  const s = document.createElement(t);
  Object.entries(a).forEach(([n, o]) => {
    if (n === "class") s.className = o;
    else if (n.startsWith("on") && typeof o == "function")
      s.addEventListener(n.substring(2).toLowerCase(), o);
    else if (o != null) s.setAttribute(n, o);
  });
  i.flat().forEach(n =>
    s.append(n instanceof Node ? n : document.createTextNode(String(n)))
  );
  return s;
}

function p(t) {
  alert((t == null ? void 0 : t.message) || "Something went wrong");
}

function O() {
  v.innerHTML = "";
  const t = e(
    "form",
    { class: "card login", id: "loginForm" },
    e("div", { class: "title" }, "Delivery Panel · COD"),
    e("div", { class: "hint" }, "Sign in with your delivery account (role: Delivery agent)."),
    e("div", { class: "row" },
      e("input", {
        class: "input",
        type: "text",
        placeholder: "Email or username",
        name: "identifier",
        required: !0,
        style: "flex:1"
      })
    ),
    e("div", { class: "row", style: "margin-top:8px" },
      e("input", {
        class: "input",
        type: "password",
        placeholder: "Password",
        name: "password",
        required: !0,
        style: "flex:1"
      })
    ),
    e("div", { class: "row", style: "margin-top:12px; justify-content: flex-end" },
      e("button", { type: "submit", class: "btn btn-primary" }, "Sign in")
    )
  );

  t.addEventListener("submit", async a => {
    a.preventDefault();
    const i = new FormData(t);
    try {
      await c.login(i.get("identifier"), i.get("password"));
      await E();
    } catch (s) {
      p(s);
    }
  });

  v.append(t);
}

function D(t, a) {
  const i = e(
    "span",
    {
      class: "badge " +
        ((t.payment?.status === "paid" || t.payment?.status === "cod_collected")
          ? "badge-info"
          : "badge-warn")
    },
    `${t.payment?.method || "-"} · ${t.payment?.status || "-"}`
  );

  const s = [];
  s.push(
    e("button", {
      class: "btn btn-outline",
      onclick: async () => {
        try {
          await c.setOrderStatus(t.id, "out_for_delivery");
          await a();
        } catch (r) {
          p(r);
        }
      }
    }, "Out for delivery"),

    e("button", {
      class: "btn btn-outline",
      onclick: async () => {
        try {
          if (!confirm("Mark as DELIVERED? OK to proceed (POD optional). Click Cancel to abort."))
            return;
          await c.setOrderStatus(t.id, "delivered");
          await a();
        } catch (r) {
          p(r);
        }
      }
    }, "Delivered"),

    e("button", {
      class: "btn btn-outline",
      onclick: async () => {
        const r = prompt("Attempted delivery reason (e.g., NO_ANSWER):") || "";
        try {
          await c.setOrderStatus(t.id, "attempted", r ? { reason: { detail: r } } : void 0);
          await a();
        } catch (g) {
          p(g);
        }
      }
    }, "Attempted"),

    e("button", {
      class: "btn btn-danger",
      onclick: async () => {
        const r = prompt("Failed delivery reason:") || "";
        try {
          await c.setOrderStatus(t.id, "failed", r ? { reason: { detail: r } } : void 0);
          await a();
        } catch (g) {
          p(g);
        }
      }
    }, "Failed")
  );

  const n = ["out_for_delivery", "delivered", "attempted", "failed", "return_to_sender", "returned", "exception"]
    .includes(String(t.deliveryState));

  if (
    t.payment?.method === "COD" &&
    (n || t.orderState === "confirmed") &&
    t.payment?.status === "cod_pending"
  ) {
    s.unshift(
      e("button", {
        class: "btn btn-success",
        onclick: async () => {
          if (confirm("Mark COD as COLLECTED?"))
            try {
              await c.setCodPayment(t.id, "paid");
              await a();
            } catch (r) {
              p(r);
            }
        }
      }, "Mark collected"),

      e("button", {
        class: "btn btn-danger",
        onclick: async () => {
          if (confirm("Mark COD as FAILED?"))
            try {
              await c.setCodPayment(t.id, "failed");
              await a();
            } catch (r) {
              p(r);
            }
        }
      }, "Mark failed")
    );
  }

  return e(
    "div",
    { class: "order" },
    e("div", {},
      e("div", {}, e("strong", {}, t.id)),
      e("div", { class: "meta" },
        `${t.address?.city || "-"} · ${t.address?.line1 || "-"}${t.address?.phone ? ` · ${t.address.phone}` : ""}`
      ),
      e("div", { class: "meta" },
        (t.items || []).map(r => `${r.qty}× ${r.name}`).join(", ")
      )
    ),
    e("div", { class: "actions" },
      e("button", { class: "btn btn-outline", onclick: () => a() }, "Refresh"),
      ...s,
      i
    )
  );
}

async function E() {
  try {
    await c.me();
  } catch {
    O();
    return;
  }

  v.innerHTML = "";
  let t = "";

  const a = e(
    "div",
    { class: "header" },
    e("div", { class: "h1" }, "Delivery Panel"),
    e("div", { class: "row" },
      e("select", { class: "select", id: "statusSelect" },
        e("option", { value: "" }, "All statuses"),
        e("option", { value: "dispatched" }, "Dispatched"),
        e("option", { value: "out_for_delivery" }, "Out for delivery"),
        e("option", { value: "delivered" }, "Delivered"),
        e("option", { value: "attempted" }, "Attempted"),
        e("option", { value: "failed" }, "Failed"),
        e("option", { value: "return_to_sender" }, "Return to sender"),
        e("option", { value: "returned" }, "Returned"),
        e("option", { value: "exception" }, "Exception")
      ),
      e("select", { class: "select", id: "methodSelect", style: "margin-left:8px" },
        e("option", { value: "" }, "All methods"),
        e("option", { value: "COD" }, "COD"),
        e("option", { value: "CARD" }, "Card"),
        e("option", { value: "BANK" }, "Slip upload")
      ),
      e("button", { class: "btn btn-primary", onclick: () => s() }, "Refresh"),
      e("div", { class: "spacer" }),
      e("button", {
        class: "btn btn-outline",
        onclick: async () => {
          try {
            await c.logout();
            O();
          } catch (n) {
            p(n);
          }
        }
      }, "Logout")
    )
  );

  const i = e("div", { class: "card" }, e("div", {}, "Loading..."));
  v.append(e("div", { class: "card" }, a), i);

  async function s() {
    const n = document.getElementById("statusSelect");
    const o = document.getElementById("methodSelect");
    t = n?.value || "";
    const l = o?.value || "";
    i.innerHTML = "";

    try {
      const u = await c.listOrders(t, l);
      const y = () => s();

      if (!(u.items?.length)) {
        i.append(e("div", { class: "meta" }, "No orders"));
        return;
      }

      u.items.forEach(f => i.append(D(f, y)));
    } catch (u) {
      i.append(e("div", { class: "meta" }, u.message || "Failed to load orders"));
    }
  }

  await s();
}

E();
