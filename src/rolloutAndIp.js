import { v4 as uuidv4 } from "uuid";

export default {
  async fetch(request, env, ctx) {
    const { method } = request;

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const { pathname } = url;

    // Match rollout endpoints
    if (pathname.startsWith("/dev/player_rollouts/rollouts")) {
      if (method === "GET") {
        return handleRolloutsGet(env, corsHeaders);
      }
      if (method === "POST") {
        return handleRolloutsPost(request, env, corsHeaders);
      }
    }

    // Match whitelist endpoints
    if (pathname.startsWith("/dev/player_rollouts/whitelist")) {
      if (method === "GET") {
        return handleWhitelistGet(env, corsHeaders);
      }
      if (method === "POST") {
        return handleWhitelistPost(request, env, corsHeaders);
      }
      if (method === "DELETE") {
        return handleWhitelistDelete(request, env, corsHeaders);
      }
    }

    return jsonResponse(404, { error: "Not found" }, corsHeaders);
  },
};


async function handleRolloutsGet(env, corsHeaders) {
  const allKeys = await env.RTE_KV.list();
  const result = {};

  for (const { name } of allKeys.keys) {
    const value = await env.RTE_KV.get(name);
    try {
      result[name] = value ? JSON.parse(value) : null;
    } catch {
      result[name] = "Invalid JSON";
    }
  }

  return jsonResponse(200, result, corsHeaders);
}

async function handleRolloutsPost(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || typeof value === "undefined") {
      return jsonResponse(400, { error: "Missing key or value" }, corsHeaders);
    }

    if (
      !Object.prototype.hasOwnProperty.call(value, "rollout") ||
      !Object.prototype.hasOwnProperty.call(value, "comment")
    ) {
      return jsonResponse(
        400,
        { error: "Value must contain rollout and comment fields" },
        corsHeaders
      );
    }

    await env.RTE_KV.put(key, JSON.stringify(value));

    return jsonResponse(
      200,
      { message: `Stored key "${key}" with value`, stored: { key, value } },
      corsHeaders
    );
  } catch {
    return jsonResponse(400, { error: "Invalid JSON" }, corsHeaders);
  }
}

async function handleWhitelistGet(env, corsHeaders) {
  const allKeys = await env.IP_KV.list();
  const result = {};

  for (const { name } of allKeys.keys) {
    const value = await env.IP_KV.get(name);
    try {
      result[name] = value ? JSON.parse(value) : null;
    } catch {
      result[name] = "Invalid JSON";
    }
  }

  return jsonResponse(200, result, corsHeaders);
}

async function handleWhitelistPost(request, env, corsHeaders) {
  try {
    const body = await request.json();

    // Either update existing (if key provided) or create new
    let key = body.key || uuidv4();
    const value = {
      ipv4: body.ipv4 || (body.value?.ipv4 ?? "").trim(),
      ipv6: body.ipv6 || (body.value?.ipv6 ?? "").trim(),
      comment: body.comment || (body.value?.comment ?? "").trim(),
    };

    if (!value.ipv4 && !value.ipv6) {
      return jsonResponse(400, { error: "Missing ipv4 or ipv6" }, corsHeaders);
    };

    await env.IP_KV.put(key, JSON.stringify(value));

    // verifies 
    const storedValue = await env.IP_KV.get(key, "json");
    if (!storedValue) {
      return jsonResponse(500, { error: `KV write verification failed: "${key}" not found` }, corsHeaders);
    };

    return jsonResponse(
      200,
      {
        message: body.key ? "Updated whitelist entry" : "Stored new whitelist entry",
        stored: { key, value: storedValue },
      },
      corsHeaders
    );
  } catch {
    return jsonResponse(400, { error: "Invalid JSON" }, corsHeaders);
  }
}

async function handleWhitelistDelete(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const { key } = body;

    if (!key) {
      return jsonResponse(400, { error: "Missing key" }, corsHeaders);
    }

    await env.IP_KV.delete(key);

    return jsonResponse(
      200,
      { message: `Deleted whitelist entry "${key}"` },
      corsHeaders
    );
  } catch {
    return jsonResponse(400, { error: "Invalid JSON" }, corsHeaders);
  }
}

function jsonResponse(status, message, corsHeaders) {
  return new Response(JSON.stringify({ status, message }), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
