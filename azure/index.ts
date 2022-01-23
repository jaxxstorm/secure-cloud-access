import * as pulumi from "@pulumi/pulumi";
import * as authorization from "@pulumi/azure-native/authorization";
import * as azuread from "@pulumi/azuread";
import * as github from "@pulumi/github";

const adApp = new azuread.Application("gha", {
  displayName: "githubActions",
});

const adSp = new azuread.ServicePrincipal(
  "ghaSp",
  { applicationId: adApp.applicationId },
  { parent: adApp }
);

const adSpPassword = new azuread.ServicePrincipalPassword(
  "aksSpPassword",
  {
    servicePrincipalId: adSp.id,
    endDate: "2099-01-01T00:00:00Z",
  },
  { parent: adSp }
);

new azuread.ApplicationFederatedIdentityCredential("gha", {
  audiences: ["api://AzureADTokenExchange"],
  subject: "repo:jaxxstorm/secure-cloud-access",
  issuer: "https://token.actions.githubusercontent.com/",
  applicationObjectId: adApp.objectId,
  displayName: "github-actions",
}, { parent: adApp });

const subInfo = authorization.getClientConfig();

subInfo.then((info) => {
  new github.ActionsSecret("clientId", {
    repository: "secure-cloud-access",
    secretName: "AZURE_CLIENT_ID",
    plaintextValue: info.clientId,
  });

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
});
