import { AuthorizationManagementClient } from "@azure/arm-authorization";
import { TokenCredentials } from "@azure/ms-rest-js";
import * as authorization from "@pulumi/azure-native/authorization";

async function getAuthorizationManagementClient(): Promise<AuthorizationManagementClient> {
  const config = await authorization.getClientConfig();
  const token = await authorization.getClientToken();
  const credentials = new TokenCredentials(token.token);
  // Note: reuse the credentials and/or the client in case your scenario needs
  // multiple calls to Azure SDKs.
  return new AuthorizationManagementClient(credentials, config.subscriptionId);
}

export async function getRoleIdByName(
  roleName: string,
  scope?: string
): Promise<string> {
  const client = await getAuthorizationManagementClient();
  const roles = await client.roleDefinitions.list(scope || "", {
    filter: `roleName eq '${roleName}'`,
  });
  if (roles.length === 0) {
    throw new Error(`role "${roleName}" not found at scope "${scope}"`);
  }
  if (roles.length > 1) {
    throw new Error(
      `too many roles "${roleName}" found at scope "${scope}". Found: ${roles.length}`
    );
  }
  const role = roles[0];
  return role.id!;
}
