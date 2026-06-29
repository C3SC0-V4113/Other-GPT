import 'server-only';

import { canUseMiradorTools } from '@/lib/roles';

import type { ProjectAuthResponse } from '@cesco_valle/identity-contracts/user';
import type OpenAI from 'openai';

const MIRADOR_SERVER_LABEL = 'mirador';

/**
 * Builds the remote MCP tool entry for Mirador Core, gated by elevated role
 * (`pro` / `admin`). Returns an empty array for basic users, or when the MCP
 * env config is missing, so the chat request stays identical in those cases.
 *
 * The OpenAI Responses API calls the MCP server directly (server-side): the
 * bearer token in `MIRADOR_MCP_API_KEY` never reaches the browser (BFF pattern),
 * and `authorization` is sent to Mirador as an `Authorization: Bearer` header.
 * Tools run without human approval (`require_approval: 'never'`) so the chat
 * keeps streaming uninterrupted.
 */
export function buildMiradorMcpTools(user: ProjectAuthResponse | null): OpenAI.Responses.Tool[] {
  if (!user || !canUseMiradorTools(user)) {
    return [];
  }

  const serverUrl = process.env.MIRADOR_MCP_URL;
  const apiKey = process.env.MIRADOR_MCP_API_KEY;

  if (!serverUrl || !apiKey) {
    return [];
  }

  return [
    {
      authorization: apiKey,
      // snake_case keys below are the OpenAI Responses MCP tool wire format, not
      // our own naming — they must match the API contract verbatim.
      /* eslint-disable @typescript-eslint/naming-convention */
      require_approval: 'never',
      server_label: MIRADOR_SERVER_LABEL,
      server_url: serverUrl,
      /* eslint-enable @typescript-eslint/naming-convention */
      type: 'mcp',
    },
  ];
}
