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
