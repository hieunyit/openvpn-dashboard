
import { type NextRequest, NextResponse } from "next/server"

// Cập nhật URL API mới
const API_URL = "http://localhost:8080"

async function proxyRequest(request: NextRequest, { params }: { params: { path: string[] } }, method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH") {
  const path = params.path.join("/")
  let requestUrl = `${API_URL}/${path}`
  
  if (method === "GET") {
    const searchParams = request.nextUrl.searchParams.toString()
    if (searchParams) {
      requestUrl += `?${searchParams}`
    }
  }

  const requestHeaders: HeadersInit = {
    "ngrok-skip-browser-warning": "1",
  };

  const clientContentType = request.headers.get("Content-Type");
  let outgoingBody: BodyInit | null = null;

  // Preserve client's Content-Type if provided explicitly
  if (clientContentType) {
    requestHeaders["Content-Type"] = clientContentType;
  }

  if (method === "POST" || method === "PUT" || method === "PATCH") {
    if (request.body) { // Client sent a body stream
        if (clientContentType?.includes("application/json")) {
            const clientBodyText = await request.text();
            if (clientBodyText) {
                try {
                    JSON.parse(clientBodyText); // Validate
                    outgoingBody = clientBodyText;
                    // Content-Type already set if clientContentType was present
                } catch (e) {
                    outgoingBody = clientBodyText; // Forward raw text
                }
            } else { // Client sent Content-Type: application/json but an empty body stream (or empty text)
                outgoingBody = JSON.stringify({});
                if (!requestHeaders["Content-Type"]) requestHeaders["Content-Type"] = "application/json"; // Ensure C-T if not set by client
            }
        } else { // Client sent a body, but not JSON (e.g., FormData)
            outgoingBody = request.body;
        }
    } else { // Client sent NO body
        // If client specified Content-Type: application/json (e.g. for a POST or PUT without body data), send empty {}
        if (clientContentType?.includes("application/json")) {
            outgoingBody = JSON.stringify({});
            // Content-Type already set if clientContentType was present
        }
        // If client sent no body AND no Content-Type (e.g. for 'reset-otp', 'enable', 'disable' PUTs):
        // - `outgoingBody` remains null.
        // - `requestHeaders["Content-Type"]` remains unset (unless client sent one, handled above).
        // This means the proxy will send the request to backend with no body and no explicit Content-Type from proxy.
        else if (!clientContentType && (method === "PUT" || method === "PATCH")) {
             // No specific action
        } else if (!clientContentType && method === "POST") {
            // For POST with no client body and no client C-T, some backends might expect an empty JSON if they consume JSON.
            // However, to be safe and avoid breaking other POSTs, let's only add {} if Swagger implies it's needed.
            // For now, send as is (no body, no C-T from proxy).
             // No specific action
        }
    }
  }


  const authHeader = request.headers.get("Authorization")
  if (authHeader) {
    requestHeaders["Authorization"] = authHeader
  }

  const fetchOptions: RequestInit = {
    method: method,
    headers: requestHeaders,
    redirect: "follow", 
    body: outgoingBody,
  }
  
  if (method === "POST" || method === "PUT" || method === "DELETE" || method === "PATCH") {
    (fetchOptions as any).duplex = 'half';
  }


  if (method === "GET") {
    fetchOptions.cache = "no-store"; 
  }

  try {
    const apiResponse = await fetch(requestUrl, fetchOptions)
    
    const responseHeaders = new Headers(apiResponse.headers)
    const originalContentType = apiResponse.headers.get("content-type")
    if (originalContentType) {
        responseHeaders.set("content-type", originalContentType)
    }
    responseHeaders.delete('X-Frame-Options'); 


    if (!apiResponse.body || apiResponse.status === 204) { 
        return new NextResponse(null, { 
            status: apiResponse.status,
            statusText: apiResponse.statusText,
            headers: responseHeaders,
        });
    }

    // Read the body as text first to avoid "disturbed or locked" issues if we need to parse it differently
    const responseText = await apiResponse.text();
    
    // Try to parse as JSON if content type suggests it
    if (originalContentType && originalContentType.includes("application/json")) {
        try {
            const data = JSON.parse(responseText);
            return NextResponse.json(data, {
                status: apiResponse.status,
                headers: responseHeaders,
            });
        } catch (parseError) {
            // If JSON parsing fails but C-T was JSON, log warning and return as text
            return new NextResponse(responseText, {
                status: apiResponse.status, 
                headers: responseHeaders,
            });
        }
    } else {
        // For non-JSON responses, return the text directly
        return new NextResponse(responseText, {
            status: apiResponse.status,
            statusText: apiResponse.statusText,
            headers: responseHeaders,
        });
    }

  } catch (error: any) { 
    let errorMessageForClient = "Proxy request failed";

    const nodeError = error as NodeJS.ErrnoException;
    const errorCode = nodeError.code || (nodeError.cause as NodeJS.ErrnoException)?.code;

    if (errorCode) {
        switch (errorCode) {
            case 'ECONNREFUSED':
                errorMessageForClient = "Proxy error: Connection refused by backend service.";
                break;
            case 'ENOTFOUND':
            case 'EAI_AGAIN':
                errorMessageForClient = "Proxy error: Backend service address not found or DNS issue.";
                break;
            case 'ETIMEDOUT':
            case 'ESOCKETTIMEDOUT': // Added ESOCKETTIMEDOUT for more timeout cases
                errorMessageForClient = "Proxy error: Connection to backend service timed out.";
                break;
            default:
                errorMessageForClient = `Proxy error (Code: ${errorCode})`;
        }
    } else if (nodeError.message) {
        if (nodeError.message.includes("Response body object should not be disturbed or locked")) {
            // This message is often a symptom of an underlying network issue with fetch in Node.
            // Provide a more user-friendly message.
            errorMessageForClient = "Proxy error: Problem connecting to backend service.";
        } else {
            errorMessageForClient = `Proxy error: Network issue or backend unavailable. Detail: ${nodeError.message.substring(0, 100)}`;
        }
    } else {
      errorMessageForClient = `Proxy error: An unknown network error occurred while connecting to the backend.`;
    }
    
    return NextResponse.json({ error: `Failed to ${method.toLowerCase()} data: ${errorMessageForClient}` }, { status: 502 });
  }
}


export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, { params }, "GET");
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, { params }, "POST");
}

export async function PUT(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, { params }, "PUT");
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, { params }, "DELETE");
}

export async function PATCH(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, { params }, "PATCH");
}


