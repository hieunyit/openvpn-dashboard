
import { refreshToken, getAccessToken, logout } from "./auth"
import { formatDateForAPI, formatDateForDisplay, formatDateForInput, formatBytes } from "./utils";

// This constant is the prefix for our Next.js API proxy route.
const PROXY_ROUTE_PREFIX = "/api/proxy";

export async function fetchWithAuth(backendRelativePath: string, options: RequestInit = {}) {
  let token = getAccessToken();

  const isAuthPath = backendRelativePath.startsWith('auth/');
  const isTemplatePath = backendRelativePath.includes('/template');

  if (!token && !isAuthPath && !isTemplatePath) {
    // console.warn("[fetchWithAuth] No auth token available for non-auth path:", backendRelativePath);
    await logout(); // Ensure logout if critical non-auth path is hit without token
    throw new Error("SESSION_EXPIRED"); // Use a specific error
  }

  const headers: HeadersInit = {
    ...options.headers,
    "ngrok-skip-browser-warning": "1",
  };

  if (options.body instanceof FormData) {
    // Let browser set Content-Type for FormData
    // delete headers['Content-Type'];
  } else if (!headers['Content-Type'] && (options.method === "POST" || options.method === "PUT" || options.method === "PATCH")) {
    headers['Content-Type'] = 'application/json';
  }


  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const fullProxyUrl = `${PROXY_ROUTE_PREFIX}/${backendRelativePath}`;

    // console.log(`[fetchWithAuth] Requesting: ${options.method || 'GET'} ${fullProxyUrl}`);

    let response = await fetch(fullProxyUrl, {
      ...options,
      headers,
    });

    if (response.status === 401 && !isAuthPath) {
      // console.log(`[fetchWithAuth] Token expired for ${fullProxyUrl}, attempting refresh.`);
      const refreshed = await refreshToken(); // refreshToken now handles logout on its own failure
      if (refreshed) {
        // console.log(`[fetchWithAuth] Token refreshed, retrying ${fullProxyUrl}.`);
        token = getAccessToken(); // Get the new token
        const newHeadersRefresh: HeadersInit = { ...headers };
        if (token) {
          newHeadersRefresh['Authorization'] = `Bearer ${token}`;
        }
        response = await fetch(fullProxyUrl, {
          ...options,
          headers: newHeadersRefresh,
        });
      } else {
        // console.error(`[fetchWithAuth] Token refresh failed for ${fullProxyUrl}. Session should be terminated.`);
        // logout() should have been called by refreshToken or validateToken paths leading here
        throw new Error("SESSION_EXPIRED"); // Critical: stop processing if refresh fails
      }
    }
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "SESSION_EXPIRED") {
        throw error; // Re-throw specific error to be handled by UI
    }
    // console.error(`[fetchWithAuth] API request failed for ${backendRelativePath}:`, error);
    throw error; // Re-throw other errors
  }
}

// Helper function to parse API response
function parseApiResponse(data: any, fallbackKey?: string) {
  if (data && data.success && data.success.data !== undefined) {
    return data.success.data;
  } else if (data && data.data !== undefined) { // Handle direct .data nesting
    return data.data;
  } else if (data && fallbackKey && (data[fallbackKey] !== undefined || data.total !== undefined || (typeof data === 'object' && data !== null && Object.keys(data).length > 0 && !Array.isArray(data)))) {
    return data;
  } else if (data && fallbackKey) {
    const fallbackResult: Record<string, any> = {};
    fallbackResult[fallbackKey] = [];
    fallbackResult.total = 0;
    return fallbackResult;
  }
  // If none of the above, return the data as is
  return data;
}


async function handleApiError(response: Response, operation: string): Promise<Error> {
  let errorDetails = `Server responded with ${response.status} ${response.statusText}`;
  try {
    const textBody = await response.text(); // Read body as text first
    if (textBody) {
      try {
        const errorBody = JSON.parse(textBody); // Attempt to parse text as JSON
        if (errorBody.error && errorBody.error.message) {
          errorDetails = errorBody.error.message;
        } else if (errorBody.message) {
          errorDetails = errorBody.message;
        } else if (typeof errorBody === 'string') {
          errorDetails = errorBody;
        } else if (errorBody.error && typeof errorBody.error === 'string') {
          errorDetails = errorBody.error;
        } else {
          errorDetails = textBody.substring(0, 500); // Limit length for unknown JSON structure
        }
      } catch (jsonParseError) {
        // If JSON parsing fails, use the text body
        errorDetails = textBody.substring(0, 500); // Limit length
      }
    }
  } catch (e) {
    // console.warn(`[API Error - ${operation}] Failed to read error response body:`, e);
  }
  return new Error(`Failed to ${operation}. Server error: ${errorDetails}`);
}


// User API functions
export async function getUsers(page = 1, limit = 10, filters: Record<string, any> = {}) {
  // console.log("[API getUsers] Fetching users with page:", page, "limit:", limit, "filters:", JSON.stringify(filters, null, 2));
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  // Define all possible filter keys based on the new API spec
  const allowedFilterKeys = [
    "username", "email", "authMethod", "role", "groupName", 
    "isEnabled", "denyAccess", "mfaEnabled", 
    "userExpirationAfter", "userExpirationBefore", "includeExpired", "expiringInDays",
    "hasAccessControl", "macAddress", "searchText",
    "sortBy", "sortOrder", "exactMatch", "caseSensitive"
  ];

  Object.entries(filters).forEach(([key, value]) => {
    if (allowedFilterKeys.includes(key) && value !== undefined && value !== null && value !== "" && value !== "any") {
      queryParams.append(key, String(value));
    }
  });

  const response = await fetchWithAuth(`api/users?${queryParams.toString()}`);
  if (!response.ok) {
    throw await handleApiError(response, "fetch users");
  }

  const data = await response.json();
  // console.log("[API getUsers] Received data:", data);
  const responseData = parseApiResponse(data, "users");

  return {
    users: responseData.users || [],
    total: responseData.total || 0,
    page: responseData.page || page,
    totalPages: Math.ceil((responseData.total || 0) / limit),
  };
}

export async function getUser(username: string) {
  // console.log(`[API getUser] Fetching user: ${username}`);
  const response = await fetchWithAuth(`api/users/${username}`);
  if (!response.ok) {
     throw await handleApiError(response, `fetch user ${username}`);
  }

  const data = await response.json();
  // console.log(`[API getUser] Received data for ${username}:`, data);
  return parseApiResponse(data);
}

export async function createUser(userData: any) {
  // console.log("[API createUser] Creating user with data:", userData);
  const allowedFields: any = {
    username: userData.username,
    email: userData.email,
    authMethod: userData.authMethod,
    groupName: userData.groupName === "No Group" ? undefined : userData.groupName,
    userExpiration: formatDateForAPI(userData.userExpiration),
    macAddresses: userData.macAddresses,
    accessControl: userData.accessControl,
  };
  if (userData.authMethod === "local" && userData.password) {
    allowedFields.password = userData.password;
  }


  const response = await fetchWithAuth(`api/users`, {
    method: "POST",
    body: JSON.stringify(allowedFields),
  });

  if (!response.ok) {
    throw await handleApiError(response, "create user");
  }
  const responseData = await response.json();
  // console.log("[API createUser] Response:", responseData);
  return responseData;
}

export async function updateUser(username: string, userData: any) {
  // console.log(`[API updateUser] Updating user ${username} with data:`, userData);
  const allowedFields:any = {
    accessControl: userData.accessControl,
    denyAccess: userData.denyAccess,
    groupName: userData.groupName === "none" || userData.groupName === "" ? undefined : userData.groupName,
    macAddresses: userData.macAddresses,
    userExpiration: userData.userExpiration ? formatDateForAPI(userData.userExpiration) : undefined,
  };

  const cleanData = Object.fromEntries(Object.entries(allowedFields).filter(([_, value]) => value !== undefined));

  const response = await fetchWithAuth(`api/users/${username}`, {
    method: "PUT",
    body: JSON.stringify(cleanData),
  });

  if (!response.ok) {
    throw await handleApiError(response, `update user ${username}`);
  }
  const responseData = await response.json();
  // console.log(`[API updateUser] Response for ${username}:`, responseData);
  return responseData;
}

export async function deleteUser(username: string) {
  // console.log(`[API deleteUser] Deleting user: ${username}`);
  const response = await fetchWithAuth(`api/users/${username}`, {
    method: "DELETE",
  });

  if (!response.ok) {
     throw await handleApiError(response, `delete user ${username}`);
  }
  const responseData = await response.json();
  // console.log(`[API deleteUser] Response for ${username}:`, responseData);
  return responseData;
}

export async function performUserAction(username: string, action: "enable" | "disable" | "reset-otp" | "change-password", data?: any) {
  // console.log(`[API performUserAction] Performing action ${action} on user ${username} with data:`, data);
  const options: RequestInit = {
    method: "PUT",
  };

  let bodyData: any = undefined;
  if (action === "change-password" && data && data.newPassword) {
    bodyData = { password: data.newPassword };
  } else if (data && Object.keys(data).length > 0 && action !== "enable" && action !== "disable" && action !== "reset-otp") {
    bodyData = data;
  }


  if (bodyData !== undefined && Object.keys(bodyData).length > 0) {
    options.body = JSON.stringify(bodyData);
  } else if (action === "enable" || action === "disable" || action === "reset-otp") {
     // For these actions, the backend might not expect a body or an empty body is fine.
     // If an empty body is required, ensure it's explicitly sent as JSON.stringify({})
     // If no body is expected, this is fine.
  }


  const response = await fetchWithAuth(`api/users/${username}/${action}`, options);

  if (!response.ok) {
    throw await handleApiError(response, `perform action ${action} on user ${username}`);
  }
  const responseData = await response.json();
  // console.log(`[API performUserAction] Response for ${action} on ${username}:`, responseData);
  return responseData;
}

export async function disconnectUser(username: string, message?: string) {
  // console.log(`[API disconnectUser] Disconnecting user: ${username} with message: ${message}`);
  const body: { message?: string } = {};
  if (message && message.trim() !== "") {
    body.message = message.trim();
  }

  const response = await fetchWithAuth(`api/users/${username}/disconnect`, {
    method: "POST",
    body: Object.keys(body).length > 0 ? JSON.stringify(body) : JSON.stringify({}),
  });

  if (!response.ok) {
    throw await handleApiError(response, `disconnect user ${username}`);
  }
  const responseData = await response.json();
  // console.log(`[API disconnectUser] Response for ${username}:`, responseData);
  return parseApiResponse(responseData);
}


// Group API functions
export async function getGroups(page = 1, limit = 10, filters = {}) {
  // console.log("[API getGroups] Fetching groups with page:", page, "limit:", limit, "filters:", JSON.stringify(filters, null, 2));
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "any") {
      queryParams.append(key, String(value));
    }
  });

  const response = await fetchWithAuth(`api/groups?${queryParams.toString()}`);
  if (!response.ok) {
     throw await handleApiError(response, "fetch groups");
  }

  const data = await response.json();
  // console.log("[API getGroups] Received data:", data);
  const responseData = parseApiResponse(data, "groups");

  return {
    groups: responseData.groups || [],
    total: responseData.total || 0,
    page: responseData.page || page,
    totalPages: Math.ceil((responseData.total || 0) / limit),
  };
}

export async function getGroup(groupName: string) {
  // console.log(`[API getGroup] Fetching group: ${groupName}`);
  const response = await fetchWithAuth(`api/groups/${groupName}`);
  if (!response.ok) {
    throw await handleApiError(response, `fetch group ${groupName}`);
  }
  const data = await response.json();
  // console.log(`[API getGroup] Received data for ${groupName}:`, data);
  return parseApiResponse(data);
}

export async function createGroup(groupData: {
  groupName: string;
  authMethod: string;
  role: string;
  mfa: boolean;
  accessControl?: string[];
  groupRange?: string[];
  groupSubnet?: string[];
}) {
  // console.log("[API createGroup] Creating group with data:", groupData);
  const apiGroupData = {
    groupName: groupData.groupName,
    authMethod: groupData.authMethod,
    role: groupData.role,
    mfa: groupData.mfa,
    accessControl: groupData.accessControl && groupData.accessControl.length > 0 ? groupData.accessControl : undefined,
    groupRange: groupData.groupRange && groupData.groupRange.length > 0 ? groupData.groupRange : undefined,
    groupSubnet: groupData.groupSubnet && groupData.groupSubnet.length > 0 ? groupData.groupSubnet : undefined,
  };

  const response = await fetchWithAuth(`api/groups`, {
    method: "POST",
    body: JSON.stringify(apiGroupData),
  });

  if (!response.ok) {
    throw await handleApiError(response, "create group");
  }
  const responseData = await response.json();
  // console.log("[API createGroup] Response:", responseData);
  return responseData;
}

export async function updateGroup(groupName: string, groupData: {
  role?: string;
  mfa?: boolean;
  accessControl?: string[];
  denyAccess?: boolean;
  groupRange?: string[];
  groupSubnet?: string[];
}) {
  // console.log(`[API updateGroup] Updating group ${groupName} with data:`, groupData);

  const payload: any = {};
  if (groupData.role !== undefined) payload.role = groupData.role;
  if (groupData.mfa !== undefined) payload.mfa = groupData.mfa;
  if (groupData.accessControl !== undefined) payload.accessControl = groupData.accessControl;
  if (groupData.denyAccess !== undefined) payload.denyAccess = groupData.denyAccess;
  if (groupData.groupRange !== undefined) payload.groupRange = groupData.groupRange;
  if (groupData.groupSubnet !== undefined) payload.groupSubnet = groupData.groupSubnet;

  const response = await fetchWithAuth(`api/groups/${groupName}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await handleApiError(response, `update group ${groupName}`);
  }
  const responseData = await response.json();
  // console.log(`[API updateGroup] Response for ${groupName}:`, responseData);
  return responseData;
}

export async function deleteGroup(groupName: string) {
  // console.log(`[API deleteGroup] Deleting group: ${groupName}`);
  const response = await fetchWithAuth(`api/groups/${groupName}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw await handleApiError(response, `delete group ${groupName}`);
  }
  const responseData = await response.json();
  // console.log(`[API deleteGroup] Response for ${groupName}:`, responseData);
  return responseData;
}

export async function performGroupAction(groupName: string, action: "enable" ) {
  // console.log(`[API performGroupAction] Performing action ${action} on group ${groupName}`);
  const response = await fetchWithAuth(`api/groups/${groupName}/${action}`, {
    method: "PUT", // No body is needed for these actions as per typical REST patterns for enable/disable
  });

  if (!response.ok) {
    throw await handleApiError(response, `perform action ${action} on group ${groupName}`);
  }
  const responseData = await response.json();
  // console.log(`[API performGroupAction] Response for ${action} on ${groupName}:`, responseData);
  return responseData;
}

// Dashboard statistics
export async function getUserExpirations(days = 7) {
  // console.log(`[API getUserExpirations] Fetching user expirations for ${days} days`);
  const response = await fetchWithAuth(`api/users/expirations?days=${days}`);
  if (!response.ok) {
    throw await handleApiError(response, "fetch user expirations");
  }
  const responseJson = await response.json();
  // console.log("[API getUserExpirations] Received data:", responseJson);
  const data = parseApiResponse(responseJson);

  return {
    count: data.count || 0,
    days: data.days || days,
    users: data.users || []
  };
}

// Template Download API functions
export async function downloadUserTemplate(format: "csv" | "xlsx" = "csv") {
  // console.log(`[API downloadUserTemplate] Downloading user template in format: ${format}`);
  const response = await fetchWithAuth(`api/bulk/users/template?format=${format}`);

  if (!response.ok) {
    throw await handleApiError(response, "download user template");
  }

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `users_template_${timestamp}.${format}`;

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  // console.log(`[API downloadUserTemplate] Template ${filename} downloaded.`);
  return blob;
}

export async function downloadGroupTemplate(format: "csv" | "xlsx" = "csv") {
  // console.log(`[API downloadGroupTemplate] Downloading group template in format: ${format}`);
  const response = await fetchWithAuth(`api/bulk/groups/template?format=${format}`);

  if (!response.ok) {
    throw await handleApiError(response, "download group template");
  }
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `groups_template_${timestamp}.${format}`;

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  // console.log(`[API downloadGroupTemplate] Template ${filename} downloaded.`);
  return blob;
}

// Advanced Search API functions
export async function searchUsers(searchCriteria: any) {
  // console.log("[API searchUsers] Searching users with criteria:", JSON.stringify(searchCriteria, null, 2));
  const queryParams = new URLSearchParams();
  
  const allowedFilterKeys = [
    "username", "email", "authMethod", "role", "groupName", 
    "isEnabled", "denyAccess", "mfaEnabled", 
    "userExpirationAfter", "userExpirationBefore", "includeExpired", "expiringInDays",
    "hasAccessControl", "macAddress", "searchText",
    "sortBy", "sortOrder", "exactMatch", "caseSensitive",
    "page", "limit" 
  ];

  Object.entries(searchCriteria).forEach(([key, value]) => {
    if (allowedFilterKeys.includes(key) && value !== undefined && value !== null && value !== "" && value !== "any") {
      queryParams.append(key, String(value));
    }
  });
  
  // Ensure page and limit have defaults if not provided, as API has defaults but good practice for client.
  if (!queryParams.has("page")) queryParams.set("page", "1");
  if (!queryParams.has("limit")) queryParams.set("limit", "20");


  const response = await fetchWithAuth(`api/users?${queryParams.toString()}`, { // Changed from POST to GET
    method: "GET", // API spec is GET for /api/users
  });

  if (!response.ok) {
     throw await handleApiError(response, "search users");
  }
  const data = await response.json();
  // console.log("[API searchUsers] Received data:", data);
  const parsed = parseApiResponse(data);
  return {
    users: parsed.users || [],
    total: parsed.total || 0,
    page: parsed.page || searchCriteria.page || 1,
    totalPages: Math.ceil((parsed.total || 0) / (searchCriteria.limit || 20)),
  };
}

export async function searchGroups(searchCriteria: any) {
  // console.log("[API searchGroups] Searching groups with criteria:", JSON.stringify(searchCriteria, null, 2));
  const response = await fetchWithAuth(`api/search/groups`, {
    method: "POST",
    body: JSON.stringify(searchCriteria),
  });

  if (!response.ok) {
    throw await handleApiError(response, "search groups");
  }
  const data = await response.json();
  // console.log("[API searchGroups] Raw data received:", JSON.stringify(data, null, 2));
  const parsedData = parseApiResponse(data);
  // console.log("[API searchGroups] Parsed data:", JSON.stringify(parsedData, null, 2));
  return parsedData;
}


// Import/Export API functions
export async function importUsers(file: File, format?: string, dryRun = false, override = false) {
  // console.log(`[API importUsers] Importing users. Dry run: ${dryRun}, Override: ${override}, Format: ${format}`);
  const formData = new FormData();
  formData.append("file", file);
  if (format) {
    formData.append("format", format);
  }
  formData.append("dryRun", String(dryRun));
  formData.append("override", String(override));

  // console.log("[API importUsers] FormData to be sent:");
  // for (const pair of formData.entries()) {
  //   console.log(`  ${pair[0]}: ${pair[1] instanceof File ? pair[1].name : pair[1]}`);
  // }

  const response = await fetchWithAuth(`api/bulk/users/import`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw await handleApiError(response, "import users");
  }
  const responseData = await response.json();
  // console.log("[API importUsers] Response:", responseData);
  return responseData;
}

export async function importGroups(file: File, format?: string, dryRun = false, override = false) {
  // console.log(`[API importGroups] Importing groups. Dry run: ${dryRun}, Override: ${override}, Format: ${format}`);
  const formData = new FormData();
  formData.append("file", file);
  if (format) { // The API spec shows format is optional, so only append if provided
    formData.append("format", format);
  }
  formData.append("dryRun", String(dryRun)); // API spec shows this as form data
  formData.append("override", String(override)); // API spec shows this as form data

  // console.log("[API importGroups] FormData to be sent:");
  // for (const pair of formData.entries()) {
  //   console.log(`  ${pair[0]}: ${pair[1] instanceof File ? pair[1].name : pair[1]}`);
  // }

  const response = await fetchWithAuth(`api/bulk/groups/import`, {
    method: "POST",
    body: formData,
    // Content-Type is automatically set by browser for FormData
  });

  if (!response.ok) {
     throw await handleApiError(response, "import groups");
  }
  const responseData = await response.json();
  // console.log("[API importGroups] Response:", responseData);
  return responseData;
}

// Bulk Operations API functions
export async function bulkUserActions(usernames: string[], action: "enable" | "disable" | "reset-otp") {
  // console.log(`[API bulkUserActions] Performing action ${action} on users:`, usernames);
  const response = await fetchWithAuth(`api/bulk/users/actions`, {
    method: "POST",
    body: JSON.stringify({ usernames, action }),
  });

  if (!response.ok) {
    throw await handleApiError(response, "perform bulk user actions");
  }
  const responseData = await response.json();
  // console.log("[API bulkUserActions] Response:", responseData);
  return responseData;
}

export async function bulkExtendUserExpiration(usernames: string[], newExpiration: string) {
  // console.log(`[API bulkExtendUserExpiration] Extending expiration for users:`, usernames, "to:", newExpiration);
  const response = await fetchWithAuth(`api/bulk/users/extend`, {
      method: 'POST',
      body: JSON.stringify({ usernames, newExpiration: formatDateForAPI(newExpiration) }),
  });
  if (!response.ok) {
      throw await handleApiError(response, "extend user expiration");
  }
  const responseData = await response.json();
  // console.log("[API bulkExtendUserExpiration] Response:", responseData);
  return responseData;
}


export async function bulkGroupActions(groupNames: string[], action: "enable" | "disable") {
  // console.log(`[API bulkGroupActions] Performing action ${action} on groups:`, groupNames);
  const response = await fetchWithAuth(`api/bulk/groups/actions`, {
    method: "POST", // As per new API spec
    body: JSON.stringify({ groupNames, action }),
  });

  if (!response.ok) {
    throw await handleApiError(response, "perform bulk group actions");
  }
  const responseData = await response.json();
  // console.log("[API bulkGroupActions] Response:", responseData);
  return responseData;
}

export async function bulkDisconnectUsers(usernames: string[], message?: string) {
  // console.log(`[API bulkDisconnectUsers] Disconnecting users:`, usernames, "with message:", message);
  const body: { usernames: string[]; message?: string } = { usernames };
  if (message && message.trim() !== "") {
    body.message = message.trim();
  }

  const response = await fetchWithAuth(`api/bulk/users/disconnect`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw await handleApiError(response, "bulk disconnect users");
  }
  const responseData = await response.json();
  // console.log("[API bulkDisconnectUsers] Response:", responseData);
  return parseApiResponse(responseData);
}


export async function exportUsers(filters = {}) {
  // console.log("[API exportUsers] Exporting users with filters:", filters);
  return exportSearchResults({ type: 'users', ...filters }, "csv");
}

export async function exportGroups(filters = {}) {
  // console.log("[API exportGroups] Exporting groups with filters:", filters);
  return exportSearchResults({ type: 'groups', ...filters }, "csv");
}

export async function exportSearchResults(searchCriteria: any, format: "csv" | "xlsx" | "json" = "csv") {
  // console.log("[API exportSearchResults] Exporting search results with criteria:", searchCriteria, "Format:", format);
  const queryParams = new URLSearchParams({ format });

  const response = await fetchWithAuth(`api/search/export?${queryParams.toString()}`, {
    method: "POST",
    body: JSON.stringify(searchCriteria),
  });

  if (!response.ok) {
    throw await handleApiError(response, "export search results");
  }
  // console.log("[API exportSearchResults] Export successful, returning blob.");
  return response.blob();
}


// Quick Search API
export async function quickSearch(query: string, type: "users" | "groups" | "all" = "all", limit = 20) {
  // console.log(`[API quickSearch] Query: ${query}, Type: ${type}, Limit: ${limit}`);
  const queryParams = new URLSearchParams({
    q: query,
    type,
    limit: limit.toString(),
  });

  const response = await fetchWithAuth(`api/search/quick?${queryParams.toString()}`);
  if (!response.ok) {
    throw await handleApiError(response, "perform quick search");
  }
  const responseData = await response.json();
  // console.log("[API quickSearch] Response:", responseData);
  return responseData;
}

// System health functions
export async function getSystemHealth() {
  // console.log("[API getSystemHealth] Fetching system health.");
  const response = await fetchWithAuth(`api/system/health`);
  if (!response.ok) {
    throw await handleApiError(response, "fetch system health");
  }
  const responseData = await response.json();
  // console.log("[API getSystemHealth] Response:", responseData);
  return responseData;
}

export async function getSystemStats() {
  // console.log("[API getSystemStats] Fetching system stats.");
  const response = await fetchWithAuth(`api/system/stats`);
  if (!response.ok) {
     throw await handleApiError(response, "fetch system stats");
  }
  const responseData = await response.json();
  // console.log("[API getSystemStats] Response:", responseData);
  return responseData;
}

// Activity logs
export async function getActivityLogs(page = 1, limit = 50, filters = {}) {
  // console.log(`[API getActivityLogs] Fetching logs. Page: ${page}, Limit: ${limit}, Filters:`, filters);
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "any") {
      queryParams.append(key, String(value));
    }
  });

  const response = await fetchWithAuth(`api/logs/activity?${queryParams.toString()}`);
  if (!response.ok) {
     throw await handleApiError(response, "fetch activity logs");
  }

  const data = await response.json();
  // console.log("[API getActivityLogs] Received data:", data);
  const responseData = parseApiResponse(data, "logs");
  return {
    logs: responseData.logs || [],
    total: responseData.total || 0,
    page: responseData.page || page,
    totalPages: Math.ceil((responseData.total || 0) / limit),
  };
}

// VPN Status API
export async function getVPNStatus() {
  // console.log("[API getVPNStatus] Fetching VPN status.");
  const response = await fetchWithAuth(`api/vpn/status`);
  if (!response.ok) {
    throw await handleApiError(response, "fetch VPN status");
  }
  const data = await response.json();
  // console.log("[API getVPNStatus] Received data:", data);
  return parseApiResponse(data);
}

// Server Info API
export interface ServerInfo {
  admin_ip_address?: string;
  admin_port?: string;
  client_ip_address?: string;
  client_port?: string;
  cluster_mode?: string;
  failover_mode?: string;
  license_server?: string;
  message?: string;
  node_type?: string;
  status?: string;
  web_server_name?: string;
}

export async function getServerInfo(): Promise<ServerInfo> {
  // console.log("[API getServerInfo] Fetching server info.");
  const response = await fetchWithAuth(`api/config/server/info`);
  if (!response.ok) {
    throw await handleApiError(response, "fetch server info");
  }
  const data = await response.json();
  // console.log("[API getServerInfo] Received data:", data);
  return parseApiResponse(data) as ServerInfo;
}
