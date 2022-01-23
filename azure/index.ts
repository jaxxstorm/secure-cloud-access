import * as pulumi from "@pulumi/pulumi";
import * as authorization from "@pulumi/azure-native/authorization";
import * as azuread from "@pulumi/azuread";
import * as github from "@pulumi/github";
import * as helpers from "./azureHelpers";

// create an azure AD application
const adApp = new azuread.Application("gha", {
  displayName: "githubActions",
});

// create a service principal
const adSp = new azuread.ServicePrincipal(
  "ghaSp",
  { applicationId: adApp.applicationId },
  { parent: adApp }
);

// mandatory SP password
const adSpPassword = new azuread.ServicePrincipalPassword(
  "aksSpPassword",
  {
    servicePrincipalId: adSp.id,
    endDate: "2099-01-01T00:00:00Z",
  },
  { parent: adSp }
);

/*
 * This is the magic. We set the subject to the repo we're running from
 * Also need to ensure your AD Application is the one where access is defined
 */
new azuread.ApplicationFederatedIdentityCredential(
  "gha",
  {
    audiences: ["api://AzureADTokenExchange"],
    subject: "repo:jaxxstorm/secure-cloud-access:ref:refs/heads/main", // this can be any ref
    issuer: "https://token.actions.githubusercontent.com",
    applicationObjectId: adApp.objectId,
    displayName: "github-actions",
  },
  { parent: adApp }
);

// retrieve the current tenant and subscription
const subInfo = authorization.getClientConfig();

subInfo.then((info) => {

  // define some github actions secrets so your AZ login is correct
  new github.ActionsSecret("tenantId", {
    repository: "secure-cloud-access",
    secretName: "AZURE_TENANT_ID",
    plaintextValue: info.tenantId,
  });

  new github.ActionsSecret("subscriptionId", {
    repository: "secure-cloud-access",
    secretName: "AZURE_SUBSCRIPTION_ID",
    plaintextValue: info.subscriptionId,
  });


  /* define a role assignment so we have permissions on the subscription
   * We use the helper to get the role by name, but you can of course define it explicitly
   */
  new authorization.RoleAssignment("readOnly", {
    principalId: adSp.id,
    principalType: authorization.PrincipalType.ServicePrincipal,
    scope: pulumi.interpolate`/subscriptions/${info.subscriptionId}`,
    roleDefinitionId: helpers.getRoleIdByName("Reader"),
  });
});

// finally, we set the client id to be the application we created
new github.ActionsSecret("clientId", {
  repository: "secure-cloud-access",
  secretName: "AZURE_CLIENT_ID",
  plaintextValue: adApp.applicationId,
});
