/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
  async fetch(request, env, ctx) {
    const { method } = request;
  
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle OPTIONS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    const url = new URL(request.url);

    // === GET Request ===
    if (method === 'GET') {
      const keysParam = url.searchParams.get('keys');
      const result = {};

      if (keysParam) {
        const keys = keysParam.split(',').map(k => k.trim());
        for (const key of keys) {
          const value = await env.RTE_KV.get(key);
          try {
            result[key] = value ? JSON.parse(value) : null;
          } catch {
            result[key] = 'Invalid JSON';
          }
        }
        return jsonResponse(200, result, corsHeaders);
      }

      const allKeys = await env.RTE_KV.list();
      for (const { name } of allKeys.keys) {
        const value = await env.RTE_KV.get(name);
        try {
          result[name] = value ? JSON.parse(value) : null;
        } catch {
          result[name] = 'Invalid JSON';
        }
      }

      return jsonResponse(200, result, corsHeaders);
    }

        // === POST Request ===
    if (method === 'POST') {
      try {
        const body = await request.json();
        const { key, value } = body;

        if (!key || typeof value === 'undefined') {
          return jsonResponse(400, { error: 'Missing key or value' }, corsHeaders);
        }

        // Rollout % validation — assuming value.rollout is stored as 0–1
        if (value && typeof value.rollout !== 'undefined') {
          const rolloutPercent = parseFloat(value.rollout) * 100;
          if (isNaN(rolloutPercent) || rolloutPercent < 0 || rolloutPercent > 100) {
            return jsonResponse(400, { error: 'Rollout % must be between 0 and 100' }, corsHeaders);
          }
        }

        await env.RTE_KV.put(key, JSON.stringify(value));

        return jsonResponse(200, {
          message: `Stored key "${key}" with value`,
          stored: { key, value },
        }, corsHeaders);
      } catch {
        return jsonResponse(400, { error: 'Invalid JSON' }, corsHeaders);
      }
    }

    return jsonResponse(405, { message: 'Method not allowed' }, corsHeaders);
  },
};

function jsonResponse(status, message, corsHeaders) {
  return new Response(JSON.stringify({ status, message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}


// import CIDR from "ip-cidr";

// export default {
//   async fetch(request, env, ctx) {
//     const { method } = request;
//     const url = new URL(request.url);

//     // CORS headers
//     const corsHeaders = {
//       "Access-Control-Allow-Origin": "*",
//       "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
//       "Access-Control-Allow-Headers": "Content-Type",
//     };

//     // Handle OPTIONS preflight
//     if (method === "OPTIONS") {
//       return new Response(null, { status: 204, headers: corsHeaders });
//     }

//     // Route handling
//     if (url.pathname.startsWith("/rollouts")) {
//       return handleRollouts(request, env, corsHeaders);
//     }

//     if (url.pathname.startsWith("/whitelist")) {
//       return handleWhitelist(request, env, corsHeaders);
//     }

//     return jsonResponse(404, { error: "Not found" }, corsHeaders);
//   },
// };

// // === Rollout Handlers ===
// async function handleRollouts(request, env, corsHeaders) {
//   const { method } = request;
//   const url = new URL(request.url);

//   if (method === "GET") {
//     const keysParam = url.searchParams.get("keys");
//     const result = {};

//     if (keysParam) {
//       const keys = keysParam.split(",").map((k) => k.trim());
//       for (const key of keys) {
//         const value = await env.RTE_KV.get(key);
//         try {
//           result[key] = value ? JSON.parse(value) : null;
//         } catch {
//           result[key] = "Invalid JSON";
//         }
//       }
//       return jsonResponse(200, result, corsHeaders);
//     }

//     const allKeys = await env.RTE_KV.list();
//     for (const { name } of allKeys.keys) {
//       const value = await env.RTE_KV.get(name);
//       try {
//         result[name] = value ? JSON.parse(value) : null;
//       } catch {
//         result[name] = "Invalid JSON";
//       }
//     }

//     return jsonResponse(200, result, corsHeaders);
//   }

//   if (method === "POST") {
//     try {
//       const body = await request.json();
//       const { key, value } = body;

//       if (!key || typeof value === "undefined") {
//         return jsonResponse(400, { error: "Missing key or value" }, corsHeaders);
//       }

//       // Rollout % validation
//       if (value && typeof value.rollout !== "undefined") {
//         const rolloutPercent = parseFloat(value.rollout) * 100;
//         if (
//           isNaN(rolloutPercent) ||
//           rolloutPercent < 0 ||
//           rolloutPercent > 100
//         ) {
//           return jsonResponse(
//             400,
//             { error: "Rollout % must be between 0 and 100" },
//             corsHeaders
//           );
//         }
//       }

//       await env.RTE_KV.put(key, JSON.stringify(value));

//       return jsonResponse(
//         200,
//         { message: `Stored key "${key}" with value`, stored: { key, value } },
//         corsHeaders
//       );
//     } catch {
//       return jsonResponse(400, { error: "Invalid JSON" }, corsHeaders);
//     }
//   }

//   return jsonResponse(405, { error: "Method not allowed" }, corsHeaders);
// }

// // === Whitelist Handlers ===
// async function handleWhitelist(request, env, corsHeaders) {
//   const { method } = request;
//   const url = new URL(request.url);

//   if (method === "GET") {
//     const result = {};
//     const allKeys = await env.RTE_WHITELIST.list();
//     for (const { name } of allKeys.keys) {
//       const value = await env.RTE_WHITELIST.get(name);
//       try {
//         result[name] = value ? JSON.parse(value) : null;
//       } catch {
//         result[name] = "Invalid JSON";
//       }
//     }
//     return jsonResponse(200, result, corsHeaders);
//   }

//   if (method === "POST") {
//     try {
//       const body = await request.json();
//       const { key, value } = body;

//       if (!key || typeof value === "undefined") {
//         return jsonResponse(400, { error: "Missing key or value" }, corsHeaders);
//       }

//       // Validate IP or CIDR
//       if (!new CIDR(key).isValid()) {
//         return jsonResponse(400, { error: "Invalid IP or CIDR format" }, corsHeaders);
//       }

//       await env.RTE_WHITELIST.put(key, JSON.stringify(value));

//       return jsonResponse(
//         200,
//         { message: `Stored whitelist "${key}"`, stored: { key, value } },
//         corsHeaders
//       );
//     } catch {
//       return jsonResponse(400, { error: "Invalid JSON" }, corsHeaders);
//     }
//   }

//   return jsonResponse(405, { error: "Method not allowed" }, corsHeaders);
// }

// // === Utility ===
// function jsonResponse(status, message, corsHeaders) {
//   return new Response(JSON.stringify({ status, message }), {
//     status,
//     headers: { "Content-Type": "application/json", ...corsHeaders },
//   });
// }



///////////////////////// for handling ipv4 and/or ipv6
// import { v4 as uuidv4 } from "uuid";
// import CIDR from "ip-cidr";

// async function handleWhitelist(request, env) {
//   const url = new URL(request.url);

//   if (request.method === "GET") {
//     const list = [];
//     for await (const { name, value } of env.RTE_WHITELIST.list({ limit: 1000 })) {
//       list.push({ key: name, value: JSON.parse(value) });
//     }
//     return new Response(JSON.stringify(list, null, 2), {
//       headers: { "Content-Type": "application/json" },
//     });
//   }

//   if (request.method === "POST") {
//     try {
//       const body = await request.json();
//       const { ipv4 = "", ipv6 = "", comment = "" } = body;

//       // Validate IPv4 if provided
//       if (ipv4) {
//         const cidr4 = new CIDR(ipv4);
//         if (!cidr4.isValid()) {
//           return new Response(JSON.stringify({ error: "Invalid IPv4 format" }), {
//             status: 400,
//             headers: { "Content-Type": "application/json" },
//           });
//         }
//       }

//       // Validate IPv6 if provided
//       if (ipv6) {
//         const cidr6 = new CIDR(ipv6);
//         if (!cidr6.isValid()) {
//           return new Response(JSON.stringify({ error: "Invalid IPv6 format" }), {
//             status: 400,
//             headers: { "Content-Type": "application/json" },
//           });
//         }
//       }

//       // Always create key + value, even if ipv4/ipv6 are blank
//       const key = uuidv4();
//       const value = { ipv4, ipv6, comment };

//       await env.RTE_WHITELIST.put(key, JSON.stringify(value));

//       return new Response(JSON.stringify({ success: true, key, value }), {
//         headers: { "Content-Type": "application/json" },
//       });
//     } catch (err) {
//       return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
//         status: 400,
//         headers: { "Content-Type": "application/json" },
//       });
//     }
//   }

//   return new Response("Method Not Allowed", { status: 405 });
// }



////// for handling different routes
// import { v4 as uuidv4 } from "uuid";

// export default {
//   async fetch(request, env) {
//     const url = new URL(request.url);
//     const path = url.pathname.replace("/dev/player_rollouts", ""); // strip base route
//     const method = request.method;

//     if (path.startsWith("/rollouts")) {
//       return handleRollouts(request, env, method);
//     } else if (path.startsWith("/whitelist")) {
//       return handleWhitelist(request, env, method);
//     }

//     return new Response("Not found", { status: 404 });
//   }
// };

// async function handleRollouts(request, env, method) {
//   if (method === "GET") {
//     const list = await env.RTE_KV.list();
//     const result = {};
//     for (const key of list.keys) {
//       result[key.name] = JSON.parse(await env.RTE_KV.get(key.name));
//     }
//     return jsonResponse(result);
//   }

//   if (method === "POST") {
//     const body = await request.json();
//     if (!body.key || !body.rollout) {
//       return new Response("Invalid rollout payload", { status: 400 });
//     }
//     await env.RTE_KV.put(body.key, JSON.stringify({
//       rollout: body.rollout,
//       comment: body.comment || ""
//     }));
//     return new Response("Rollout updated", { status: 200 });
//   }

//   return new Response("Method not allowed", { status: 405 });
// }

// async function handleWhitelist(request, env, method) {
//   if (method === "GET") {
//     const list = await env.IP_KV.list();
//     const result = {};
//     for (const key of list.keys) {
//       result[key.name] = JSON.parse(await env.IP_KV.get(key.name));
//     }
//     return jsonResponse(result);
//   }

//   if (method === "POST") {
//     const body = await request.json();
//     const id = uuidv4();

//     const ipv4 = body.ipv4 || "";
//     const ipv6 = body.ipv6 || "";

//     await env.IP_KV.put(id, JSON.stringify({ ipv4, ipv6 }));
//     return new Response(JSON.stringify({ id, ipv4, ipv6 }), { status: 200 });
//   }

//   return new Response("Method not allowed", { status: 405 });
// }

// function jsonResponse(data) {
//   return new Response(JSON.stringify(data), {
//     headers: { "Content-Type": "application/json" }
//   });
// }

// has cors, ipv4/ipv6 empty strings, uuid,
// import { v4 as uuidv4 } from "uuid";

// export default {
//   async fetch(request, env) {
//     const url = new URL(request.url);
//     const path = url.pathname.replace("/dev/player_rollouts", ""); // strip base route
//     const method = request.method;

//     // Handle preflight CORS
//     if (method === "OPTIONS") {
//       return handleOptions();
//     }

//     let response;
//     if (path.startsWith("/rollouts")) {
//       response = await handleRollouts(request, env, method);
//     } else if (path.startsWith("/whitelist")) {
//       response = await handleWhitelist(request, env, method);
//     } else {
//       response = new Response("Not found", { status: 404 });
//     }

//     // Wrap with CORS headers
//     return withCors(response);
//   }
// };

// async function handleRollouts(request, env, method) {
//   if (method === "GET") {
//     const list = await env.RTE_KV.list();
//     const result = {};
//     for (const key of list.keys) {
//       result[key.name] = JSON.parse(await env.RTE_KV.get(key.name));
//     }
//     return jsonResponse(result);
//   }

//   if (method === "POST") {
//     const body = await request.json();
//     if (!body.key || !body.rollout) {
//       return new Response("Invalid rollout payload", { status: 400 });
//     }
//     await env.RTE_KV.put(body.key, JSON.stringify({
//       rollout: body.rollout,
//       comment: body.comment || ""
//     }));
//     return new Response("Rollout updated", { status: 200 });
//   }

//   return new Response("Method not allowed", { status: 405 });
// }

// async function handleWhitelist(request, env, method) {
//   if (method === "GET") {
//     const list = await env.IP_KV.list();
//     const result = {};
//     for (const key of list.keys) {
//       result[key.name] = JSON.parse(await env.IP_KV.get(key.name));
//     }
//     return jsonResponse(result);
//   }

//   if (method === "POST") {
//     const body = await request.json();
//     const id = uuidv4();

//     const ipv4 = body.ipv4 || "";
//     const ipv6 = body.ipv6 || "";

//     await env.IP_KV.put(id, JSON.stringify({ ipv4, ipv6 }));
//     return jsonResponse({ id, ipv4, ipv6 });
//   }

//   return new Response("Method not allowed", { status: 405 });
// }

// function jsonResponse(data) {
//   return new Response(JSON.stringify(data), {
//     headers: { "Content-Type": "application/json" }
//   });
// }

// function withCors(response) {
//   const newHeaders = new Headers(response.headers);
//   newHeaders.set("Access-Control-Allow-Origin", "*"); // or "https://www.rte.ie"
//   newHeaders.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
//   newHeaders.set("Access-Control-Allow-Headers", "Content-Type");
//   return new Response(response.body, {
//     status: response.status,
//     statusText: response.statusText,
//     headers: newHeaders
//   });
// }

// function handleOptions() {
//   return new Response(null, {
//     status: 204,
//     headers: {
//       "Access-Control-Allow-Origin": "*", // or "https://www.rte.ie"
//       "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
//       "Access-Control-Allow-Headers": "Content-Type"
//     }
//   });
// }


//  previous one fixed to look more like handle rollouts
// import { v4 as uuidv4 } from 'uuid';

// async function handleWhitelist(request, env, corsHeaders) {
//   const url = new URL(request.url);
//   const method = request.method;

//   // === GET Request ===
//   if (method === 'GET') {
//     const allKeys = await env.IP_KV.list();
//     const result = {};

//     for (const { name } of allKeys.keys) {
//       const value = await env.IP_KV.get(name);
//       try {
//         result[name] = value ? JSON.parse(value) : null;
//       } catch {
//         result[name] = 'Invalid JSON';
//       }
//     }

//     return jsonResponse(200, result, corsHeaders);
//   }

//   // === POST Request ===
//   if (method === 'POST') {
//     try {
//       const body = await request.json();
//       const { ipv4 = "", ipv6 = "" } = body;

//       // Always generate a random unique key
//       const key = uuidv4();
//       const value = { ipv4, ipv6 };

//       await env.IP_KV.put(key, JSON.stringify(value));

//       return jsonResponse(
//         200,
//         {
//           message: `Stored whitelist entry with key "${key}"`,
//           stored: { key, value },
//         },
//         corsHeaders
//       );
//     } catch {
//       return jsonResponse(400, { error: 'Invalid JSON' }, corsHeaders);
//     }
//   }

//   // === PUT Request (edit existing entry) ===
//   if (method === 'PUT') {
//     try {
//       const body = await request.json();
//       const { key, ipv4 = "", ipv6 = "" } = body;

//       if (!key) {
//         return jsonResponse(400, { error: 'Missing key for update' }, corsHeaders);
//       }

//       const value = { ipv4, ipv6 };
//       await env.IP_KV.put(key, JSON.stringify(value));

//       return jsonResponse(
//         200,
//         {
//           message: `Updated whitelist entry with key "${key}"`,
//           stored: { key, value },
//         },
//         corsHeaders
//       );
//     } catch {
//       return jsonResponse(400, { error: 'Invalid JSON' }, corsHeaders);
//     }
//   }

//   return jsonResponse(405, { message: 'Method not allowed' }, corsHeaders);
// }
