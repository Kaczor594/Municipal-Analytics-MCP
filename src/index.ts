/**
 * Municipal Analytics MCP Server
 *
 * Cloudflare Workers-based MCP server providing read-only access
 * to municipal analytics databases via Cloudflare D1.
 *
 * Endpoints:
 * - GET /sse - Server-Sent Events endpoint for MCP protocol
 * - POST /sse - Handle MCP requests
 * - GET /health - Health check endpoint
 */

import { createTools, handleToolCall, ToolName } from './tools';
import { Env } from './database';

interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// Server capabilities and info
const SERVER_INFO = {
  name: 'municipal-analytics-mcp',
  version: '1.0.0',
  description: 'MCP server for querying municipal analytics databases',
};

const SERVER_CAPABILITIES = {
  tools: {},
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          server: SERVER_INFO.name,
          version: SERVER_INFO.version,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // SSE endpoint
    if (url.pathname === '/sse') {
      if (request.method === 'GET') {
        // Return SSE stream for connection
        return handleSSEConnection(env, corsHeaders);
      } else if (request.method === 'POST') {
        // Handle MCP requests
        return handleMCPRequest(request, env, corsHeaders);
      }
    }

    // 404 for unknown paths
    return new Response(
      JSON.stringify({
        error: 'Not Found',
        message: 'Use /sse endpoint for MCP protocol or /health for status',
      }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  },
};

/**
 * Handle SSE connection (GET /sse)
 * Returns an event stream for the MCP protocol
 */
function handleSSEConnection(
  env: Env,
  corsHeaders: Record<string, string>
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      const connectEvent = `event: open\ndata: {"status":"connected"}\n\n`;
      controller.enqueue(encoder.encode(connectEvent));

      // Send server info
      const serverInfoEvent = `event: message\ndata: ${JSON.stringify({
        jsonrpc: '2.0',
        method: 'notifications/initialized',
        params: { serverInfo: SERVER_INFO },
      })}\n\n`;
      controller.enqueue(encoder.encode(serverInfoEvent));
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

/**
 * Handle MCP protocol requests (POST /sse)
 */
async function handleMCPRequest(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  let mcpRequest: MCPRequest;

  try {
    mcpRequest = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error' },
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const response = await processMCPRequest(mcpRequest, env);

  return new Response(JSON.stringify(response), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Process individual MCP requests
 */
async function processMCPRequest(
  request: MCPRequest,
  env: Env
): Promise<MCPResponse> {
  const { id, method, params } = request;

  try {
    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: SERVER_INFO,
            capabilities: SERVER_CAPABILITIES,
          },
        };

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: createTools(),
          },
        };

      case 'tools/call': {
        const toolParams = params as {
          name: string;
          arguments?: Record<string, unknown>;
        };
        const toolName = toolParams?.name;
        const toolArgs = toolParams?.arguments || {};

        if (!toolName) {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: 'Missing tool name' },
          };
        }

        const result = await handleToolCall(
          toolName as ToolName,
          toolArgs,
          env
        );

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text:
                  typeof result === 'string'
                    ? result
                    : JSON.stringify(result, null, 2),
              },
            ],
          },
        };
      }

      case 'ping':
        return {
          jsonrpc: '2.0',
          id,
          result: {},
        };

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        };
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(`MCP request error: ${errorMessage}`);

    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32603, message: errorMessage },
    };
  }
}
