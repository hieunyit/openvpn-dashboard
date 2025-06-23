
import { refreshToken, getAccessToken, logout } from "./auth"
import { formatDateForAPI } from "./utils";

// This constant is the prefix for our Next.js API proxy route.
const PROXY_ROUTE_PREFIX = "/api/proxy";

export async function fetchWithAuth(backendRelativePath: string, options: RequestInit = {}) {
  let token = getAccessToken();

  const isAuthPath = backendRelativePath.startsWith('auth/');
  const isTemplatePath = backendRelativePath.includes('/template');

  if (!token && !isAuthPath && !isTemplatePath) {
    await logout();
    throw new Error("SESSION_EXPIRED");
  }

  const headers: HeadersInit = {
    ...options.headers,
    "ngrok-skip-browser-warning": "1",
  };

  if (options.body instanceof FormData) {
    // Let browser set Content-Type for FormData
  } else if (!headers['Content-Type'] && (options.method === "POST" || options.method === "PUT" || options.method === "PATCH")) {
    headers['Content-Type'] = 'application/json';
  }


  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const fullProxyUrl = `${PROXY_ROUTE_PREFIX}/${backendRelativePath}`;

    let response = await fetch(fullProxyUrl, {
      ...options,
      headers,
    });

    if (response.status === 401 && !isAuthPath) {
      const refreshed = await refreshToken();
      if (refreshed) {
        token = getAccessToken();
        const newHeadersRefresh: HeadersInit = { ...headers };
        if (token) {
          newHeadersRefresh['Authorization'] = `Bearer ${token}`;
        }
        response = await fetch(fullProxyUrl, {
          ...options,
          headers: newHeadersRefresh,
        });
      } else {
        throw new Error("SESSION_EXPIRED");
      }
    }
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "SESSION_EXPIRED") {
        throw error;
    }
    throw error;
  }
}

// Helper function to parse API response
function parseApiResponse(data: any, fallbackKey?: string) {
  if (data && data.success && data.success.data !== undefined) {
    return data.success.data;
  }
  if (data && data.data !== undefined) {
    return data.data;
  }
  if (data && fallbackKey && (data[fallbackKey] !== undefined || data.total !== undefined || (typeof data === 'object' && data !== null && Object.keys(data).length > 0 && !Array.isArray(data)))) {
    return data;
  }
   if (data && fallbackKey) {
     const fallbackResult: Record<string, any> = {};
     fallbackResult[fallbackKey] = [];
     fallbackResult.total = 0;
     return fallbackResult;
   }
  return data;
}


async function handleApiError(response: Response, operation: string): Promise<Error> {
  let errorDetails = `Server responded with ${response.status} ${response.statusText}`;
  try {
    const textBody = await response.text();
    if (textBody) {
      try {
        const errorBody = JSON.parse(textBody);
        let message = "An unknown error occurred";
        if (errorBody.error && errorBody.error.message) {
            message = errorBody.error.message;
        } else if (errorBody.success && errorBody.success.message) {
            // Some error responses might be wrapped in a success envelope by mistake
            message = errorBody.success.message;
        } else if (errorBody.message) {
            message = errorBody.message;
        } else if (typeof errorBody === 'string') {
            message = errorBody;
        } else if (errorBody.error && typeof errorBody.error === 'string') {
            message = errorBody.error;
        } else {
            message = textBody.substring(0, 500);
        }
        errorDetails = message;
      } catch (jsonParseError) {
        errorDetails = textBody.substring(0, 500);
      }
    }
  } catch (e) {
    console.warn(`[API Error - ${operation}] Failed to read error response body:`, e);
  }
  return new Error(`Failed to ${operation}. Server error: ${errorDetails}`);
}


// --- OpenVPN User API functions ---
export async function getUsers(page = 1, limit = 10, filters: Record<string, any> = {}) {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  const allowedFilterKeys = [
    "username", "email", "authMethod", "role", "groupName",
    "isEnabled", "denyAccess", "mfaEnabled",
    "userExpirationAfter", "userExpirationBefore", "includeExpired", "expiringInDays",
    "hasAccessControl", "macAddress", "searchText",
    "sortBy", "sortOrder", "exactMatch", "caseSensitive",
    "ipAddress"
  ];

  Object.entries(filters).forEach(([key, value]) => {
    if (allowedFilterKeys.includes(key) && value !== undefined && value !== null && value !== "" && value !== "any") {
      queryParams.append(key, String(value));
    }
  });

  const response = await fetchWithAuth(`api/openvpn/users?${queryParams.toString()}`);
  if (!response.ok) {
    throw await handleApiError(response, "fetch users");
  }

  const data = await response.json();
  const responseData = parseApiResponse(data, "users");

  return {
    users: responseData.users || [],
    total: responseData.total || 0,
    page: responseData.page || page,
    totalPages: Math.ceil((responseData.total || 0) / limit),
  };
}

export async function getUser(username: string) {
  const response = await fetchWithAuth(`api/openvpn/users/${username}`);
  if (!response.ok) {
     throw await handleApiError(response, `fetch user ${username}`);
  }

  const data = await response.json();
  return parseApiResponse(data);
}

export async function createUser(userData: any) {
  const allowedFields: any = {
    username: userData.username,
    email: userData.email,
    authMethod: userData.authMethod,
    groupName: userData.groupName === "No Group" ? undefined : userData.groupName,
    userExpiration: formatDateForAPI(userData.userExpiration),
    macAddresses: userData.macAddresses,
    accessControl: userData.accessControl,
    ipAddress: userData.ipAddress,
    ipAssignMode: userData.ipAssignMode === "none" ? undefined : userData.ipAssignMode,
  };
  if (userData.authMethod === "local" && userData.password) {
    allowedFields.password = userData.password;
  }

  const response = await fetchWithAuth(`api/openvpn/users`, {
    method: "POST",
    body: JSON.stringify(allowedFields),
  });

  if (!response.ok) {
    throw await handleApiError(response, "create user");
  }
  const responseData = await response.json();
  return responseData;
}

export async function updateUser(username: string, userData: any) {
  const updatableFieldsFromForm:any = {
    groupName: userData.groupName === "none" || userData.groupName === "" ? undefined : userData.groupName,
    userExpiration: userData.userExpiration ? formatDateForAPI(userData.userExpiration) : undefined,
    macAddresses: userData.macAddresses,
    accessControl: userData.accessControl,
    denyAccess: userData.denyAccess,
    ipAddress: userData.ipAddress || undefined,
    ipAssignMode: userData.ipAssignMode === "none" ? undefined : userData.ipAssignMode,
  };

  const cleanData = Object.fromEntries(
    Object.entries(updatableFieldsFromForm).filter(([_, value]) => value !== undefined)
  );

  const response = await fetchWithAuth(`api/openvpn/users/${username}`, {
    method: "PUT",
    body: JSON.stringify(cleanData),
  });

  if (!response.ok) {
    throw await handleApiError(response, `update user ${username}`);
  }
  const responseData = await response.json();
  return responseData;
}

export async function deleteUser(username: string) {
  const response = await fetchWithAuth(`api/openvpn/users/${username}`, {
    method: "DELETE",
  });

  if (!response.ok) {
     throw await handleApiError(response, `delete user ${username}`);
  }
  const responseData = await response.json();
  return responseData;
}

export async function performUserAction(username: string, action: "enable" | "disable" | "reset-otp" | "change-password", data?: any) {
  const options: RequestInit = {
    method: "PUT",
  };

  let bodyData: any = undefined;
  if (action === "change-password" && data && data.newPassword) {
    bodyData = { password: data.newPassword };
  }


  if (bodyData !== undefined && Object.keys(bodyData).length > 0) {
    options.body = JSON.stringify(bodyData);
  } else if (action === "enable" || action === "disable" || action === "reset-otp") {
     // No body needed for these simple actions.
  }


  const response = await fetchWithAuth(`api/openvpn/users/${username}/${action}`, options);

  if (!response.ok) {
    throw await handleApiError(response, `perform action ${action} on user ${username}`);
  }
  const responseData = await response.json();
  return responseData;
}

export async function disconnectUser(username: string, message?: string) {
  const body: { message?: string } = {};
  if (message && message.trim() !== "") {
    body.message = message.trim();
  }

  const response = await fetchWithAuth(`api/openvpn/users/${username}/disconnect`, {
    method: "POST",
    body: Object.keys(body).length > 0 ? JSON.stringify(body) : JSON.stringify({}),
  });

  if (!response.ok) {
    throw await handleApiError(response, `disconnect user ${username}`);
  }
  const responseData = await response.json();
  return parseApiResponse(responseData);
}


// --- OpenVPN Group API functions ---
export async function getGroups(page = 1, limit = 10, filters: Record<string, any> = {}) {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "any") {
      queryParams.append(key, String(value));
    }
  });

  const response = await fetchWithAuth(`api/openvpn/groups?${queryParams.toString()}`);
  if (!response.ok) {
     throw await handleApiError(response, "fetch groups");
  }

  const data = await response.json();
  const responseData = parseApiResponse(data, "groups");

  return {
    groups: responseData.groups || [],
    total: responseData.total || 0,
    page: responseData.page || page,
    totalPages: Math.ceil((responseData.total || 0) / limit),
  };
}

export async function getGroup(groupName: string) {
  const response = await fetchWithAuth(`api/openvpn/groups/${groupName}`);
  if (!response.ok) {
    throw await handleApiError(response, `fetch group ${groupName}`);
  }
  const data = await response.json();
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
  const apiGroupData = {
    groupName: groupData.groupName,
    authMethod: groupData.authMethod,
    role: groupData.role,
    mfa: groupData.mfa,
    accessControl: groupData.accessControl && groupData.accessControl.length > 0 ? groupData.accessControl : undefined,
    groupRange: groupData.groupRange && groupData.groupRange.length > 0 ? groupData.groupRange : undefined,
    groupSubnet: groupData.groupSubnet && groupData.groupSubnet.length > 0 ? groupData.groupSubnet : undefined,
  };

  const response = await fetchWithAuth(`api/openvpn/groups`, {
    method: "POST",
    body: JSON.stringify(apiGroupData),
  });

  if (!response.ok) {
    throw await handleApiError(response, "create group");
  }
  const responseData = await response.json();
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
  const payload: any = {};
  if (groupData.role !== undefined) payload.role = groupData.role;
  if (groupData.mfa !== undefined) payload.mfa = groupData.mfa;
  if (groupData.accessControl !== undefined) payload.accessControl = groupData.accessControl;
  if (groupData.denyAccess !== undefined) payload.denyAccess = groupData.denyAccess;
  if (groupData.groupRange !== undefined) payload.groupRange = groupData.groupRange;
  if (groupData.groupSubnet !== undefined) payload.groupSubnet = groupData.groupSubnet;

  const response = await fetchWithAuth(`api/openvpn/groups/${groupName}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await handleApiError(response, `update group ${groupName}`);
  }
  const responseData = await response.json();
  return responseData;
}

export async function deleteGroup(groupName: string) {
  const response = await fetchWithAuth(`api/openvpn/groups/${groupName}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw await handleApiError(response, `delete group ${groupName}`);
  }
  const responseData = await response.json();
  return responseData;
}

export async function performGroupAction(groupName: string, action: "enable" | "disable" ) {
  const response = await fetchWithAuth(`api/openvpn/groups/${groupName}/${action}`, {
    method: "PUT",
  });

  if (!response.ok) {
    throw await handleApiError(response, `perform action ${action} on group ${groupName}`);
  }
  const responseData = await response.json();
  return responseData;
}

// --- OpenVPN Dashboard statistics ---
export async function getUserExpirations(days = 7) {
  const response = await fetchWithAuth(`api/openvpn/users/expirations?days=${days}`);
  if (!response.ok) {
    throw await handleApiError(response, "fetch user expirations");
  }
  const responseJson = await response.json();
  const data = parseApiResponse(responseJson);

  return {
    count: data.count || 0,
    days: data.days || days,
    users: data.users || []
  };
}

// --- OpenVPN Template Download API functions ---
export async function downloadUserTemplate(format: "csv" | "xlsx" = "csv") {
  const response = await fetchWithAuth(`api/openvpn/bulk/users/template?format=${format}`);

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
  return blob;
}

export async function downloadGroupTemplate(format: "csv" | "xlsx" = "csv") {
  const response = await fetchWithAuth(`api/openvpn/bulk/groups/template?format=${format}`);

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
  return blob;
}

// --- OpenVPN Import/Export API functions ---
export async function importUsers(file: File, format?: string, dryRun = false, override = false) {
  const formData = new FormData();
  formData.append("file", file);
  if (format) {
    formData.append("format", format);
  }
  formData.append("dryRun", String(dryRun));
  formData.append("override", String(override));

  const response = await fetchWithAuth(`api/openvpn/bulk/users/import`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw await handleApiError(response, "import users");
  }
  const responseData = await response.json();
  return responseData;
}

export async function importGroups(file: File, format?: string, dryRun = false, override = false) {
  const formData = new FormData();
  formData.append("file", file);
  if (format) {
    formData.append("format", format);
  }
  formData.append("dryRun", String(dryRun));
  formData.append("override", String(override));

  const response = await fetchWithAuth(`api/openvpn/bulk/groups/import`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
     throw await handleApiError(response, "import groups");
  }
  const responseData = await response.json();
  return responseData;
}

// --- OpenVPN Bulk Operations API functions ---
export async function bulkUserActions(usernames: string[], action: "enable" | "disable" | "reset-otp") {
  const response = await fetchWithAuth(`api/openvpn/bulk/users/actions`, {
    method: "POST",
    body: JSON.stringify({ usernames, action }),
  });

  if (!response.ok) {
    throw await handleApiError(response, "perform bulk user actions");
  }
  const responseData = await response.json();
  return responseData;
}

export async function bulkExtendUserExpiration(usernames: string[], newExpiration: string) {
  const response = await fetchWithAuth(`api/openvpn/bulk/users/extend`, {
      method: 'POST',
      body: JSON.stringify({ usernames, newExpiration: formatDateForAPI(newExpiration) }),
  });
  if (!response.ok) {
      throw await handleApiError(response, "extend user expiration");
  }
  const responseData = await response.json();
  return responseData;
}


export async function bulkGroupActions(groupNames: string[], action: "enable" | "disable") {
  const response = await fetchWithAuth(`api/openvpn/bulk/groups/actions`, {
    method: "POST",
    body: JSON.stringify({ groupNames, action }),
  });

  if (!response.ok) {
    throw await handleApiError(response, "perform bulk group actions");
  }
  const responseData = await response.json();
  return responseData;
}

export async function bulkDisconnectUsers(usernames: string[], message?: string) {
  const body: { usernames: string[]; message?: string } = { usernames };
  if (message && message.trim() !== "") {
    body.message = message.trim();
  }

  const response = await fetchWithAuth(`api/openvpn/bulk/users/disconnect`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw await handleApiError(response, "bulk disconnect users");
  }
  const responseData = await response.json();
  return parseApiResponse(responseData);
}

// --- OpenVPN Status API ---
export async function getVPNStatus() {
  const response = await fetchWithAuth(`api/openvpn/vpn/status`);
  if (!response.ok) {
    throw await handleApiError(response, "fetch VPN status");
  }
  const data = await response.json();
  return parseApiResponse(data);
}

// --- OpenVPN Server Info API ---
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
  const response = await fetchWithAuth(`api/openvpn/config/server/info`);
  if (!response.ok) {
    throw await handleApiError(response, "fetch server info");
  }
  const data = await response.json();
  return parseApiResponse(data) as ServerInfo;
}


// --- Portal APIs ---

// --- Portal Connections ---
export async function getOpenVPNConnection() {
  const response = await fetchWithAuth(`api/portal/connections/openvpn`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw await handleApiError(response, "fetch OpenVPN connection");
  }
  return parseApiResponse(await response.json());
}

export async function testOpenVPNConnection() {
  const response = await fetchWithAuth(`api/portal/connections/openvpn/test`, { method: "POST" });
  if (!response.ok) throw await handleApiError(response, "test OpenVPN connection");
  return await response.json();
}

export async function updateOpenVPNConnection(config: any) {
  const method = config.id ? 'PUT' : 'POST';
  const response = await fetchWithAuth(`api/portal/connections/openvpn`, {
    method,
    body: JSON.stringify(config),
  });
  if (!response.ok) {
    throw await handleApiError(response, "update OpenVPN connection");
  }
  return await response.json();
}

export async function deleteOpenVPNConnection() {
    const response = await fetchWithAuth(`api/portal/connections/openvpn`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw await handleApiError(response, "delete OpenVPN connection");
    }
    return await response.json();
}

export async function getLdapConnection() {
  const response = await fetchWithAuth(`api/portal/connections/ldap`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw await handleApiError(response, "fetch LDAP connection");
  }
  return parseApiResponse(await response.json());
}

export async function testLdapConnection() {
  const response = await fetchWithAuth(`api/portal/connections/ldap/test`, { method: "POST" });
  if (!response.ok) throw await handleApiError(response, "test LDAP connection");
  return await response.json();
}

export async function updateLdapConnection(config: any) {
  const method = config.id ? 'PUT' : 'POST';
  const response = await fetchWithAuth(`api/portal/connections/ldap`, {
    method,
    body: JSON.stringify(config),
  });
  if (!response.ok) {
    throw await handleApiError(response, "update LDAP connection");
  }
  return await response.json();
}

export async function deleteLdapConnection() {
    const response = await fetchWithAuth(`api/portal/connections/ldap`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw await handleApiError(response, "delete LDAP connection");
    }
    return await response.json();
}

// --- Portal Users ---
export async function getPortalUsers() {
  const response = await fetchWithAuth(`api/portal/users`);
  if (!response.ok) throw await handleApiError(response, "fetch portal users");
  return parseApiResponse(await response.json());
}

export async function createPortalUser(userData: any) {
  const response = await fetchWithAuth(`api/portal/users`, {
    method: "POST",
    body: JSON.stringify(userData),
  });
  if (!response.ok) throw await handleApiError(response, "create portal user");
  return await response.json();
}

export async function updatePortalUser(id: string, userData: any) {
  const response = await fetchWithAuth(`api/portal/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(userData),
  });
  if (!response.ok) throw await handleApiError(response, "update portal user");
  return await response.json();
}

export async function deletePortalUser(id: string) {
  const response = await fetchWithAuth(`api/portal/users/${id}`, { method: "DELETE" });
  if (!response.ok) throw await handleApiError(response, "delete portal user");
  return await response.json();
}

export async function activatePortalUser(id: string) {
  const response = await fetchWithAuth(`api/portal/users/${id}/activate`, { method: "PUT" });
  if (!response.ok) throw await handleApiError(response, "activate portal user");
  return await response.json();
}

export async function deactivatePortalUser(id: string) {
  const response = await fetchWithAuth(`api/portal/users/${id}/deactivate`, { method: "PUT" });
  if (!response.ok) throw await handleApiError(response, "deactivate portal user");
  return await response.json();
}

export async function resetPortalUserPassword(id: string) {
  const response = await fetchWithAuth(`api/portal/users/${id}/reset-password`, { method: "PUT" });
  if (!response.ok) throw await handleApiError(response, "reset portal user password");
  return await response.json();
}

// --- Portal Groups & Permissions ---
export async function getPortalGroups() {
  const response = await fetchWithAuth(`api/portal/groups`);
  if (!response.ok) throw await handleApiError(response, "fetch portal groups");
  return parseApiResponse(await response.json());
}

export async function createPortalGroup(groupData: { name: string, displayName: string }) {
  const response = await fetchWithAuth(`api/portal/groups`, {
    method: "POST",
    body: JSON.stringify({ Name: groupData.name, DisplayName: groupData.displayName }),
  });
  if (!response.ok) throw await handleApiError(response, "create portal group");
  return await response.json();
}

export async function updatePortalGroup(id: string, groupData: { name: string, displayName: string }) {
  const response = await fetchWithAuth(`api/portal/groups/${id}`, {
    method: "PUT",
    body: JSON.stringify({ Name: groupData.name, DisplayName: groupData.displayName }),
  });
  if (!response.ok) throw await handleApiError(response, "update portal group");
  return await response.json();
}

export async function deletePortalGroup(id: string) {
  const response = await fetchWithAuth(`api/portal/groups/${id}`, { method: "DELETE" });
  if (!response.ok) throw await handleApiError(response, "delete portal group");
  return await response.json();
}

export async function getPermissions() {
    const response = await fetchWithAuth(`api/portal/permissions`);
    if (!response.ok) throw await handleApiError(response, "fetch permissions");
    const data = await response.json();
    // Permissions API might have a different structure
    return (data.success ? data.success.data : data) || [];
}

export async function getGroupPermissions(groupId: string) {
    const response = await fetchWithAuth(`api/portal/groups/${groupId}/permissions`);
    if (!response.ok) throw await handleApiError(response, "fetch group permissions");
    const data = await response.json();
     return (data.success ? data.success.data : data) || [];
}

export async function updateGroupPermissions(groupId: string, permissionIds: string[]) {
    const response = await fetchWithAuth(`api/portal/groups/${groupId}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ permission_ids: permissionIds })
    });
    if (!response.ok) throw await handleApiError(response, "update group permissions");
    return await response.json();
}


// --- Audit Logs ---
export async function getAuditLogs(filters: any) {
    const queryParams = new URLSearchParams(filters);
    const response = await fetchWithAuth(`api/portal/audit/logs?${queryParams.toString()}`);
    if (!response.ok) throw await handleApiError(response, "fetch audit logs");
    const data = await response.json()
    const responseData = parseApiResponse(data)
    return {
        logs: responseData || [], // The API returns an array directly in the data field
        total: responseData ? responseData.length : 0, // Manual total if not provided
    }
}

export async function exportAuditLogs(filters: any) {
    const queryParams = new URLSearchParams(filters);
    const response = await fetchWithAuth(`api/portal/audit/logs/export?${queryParams.toString()}`);
    if (!response.ok) throw await handleApiError(response, "export audit logs");
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().slice(0,10);
    a.download = `audit_logs_${timestamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
}
