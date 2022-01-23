import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as google from "@pulumi/google-native";
import * as github from "@pulumi/github";

const name = "github-actions"

const serviceAccount = new google.iam.v1.ServiceAccount(name, {
    accountId: "github-actions"
})

new gcp.projects.IAMMember("github-actions", {
    role: "roles/viewer",
    member: pulumi.interpolate`serviceAccount:${serviceAccount.email}`
})

const identityPool = new gcp.iam.WorkloadIdentityPool("github-actions", {
  disabled: false,
  workloadIdentityPoolId: `${name}-4`,
});

const identityPoolProvider = new gcp.iam.WorkloadIdentityPoolProvider(
  "github-actions",
  {
    workloadIdentityPoolId: identityPool.workloadIdentityPoolId,
    workloadIdentityPoolProviderId: `${name}`,
    oidc: {
      issuerUri: "https://token.actions.githubusercontent.com",
    },
    attributeMapping: {
      "google.subject": "assertion.sub",
      "attribute.actor": "assertion.actor",
      "attribute.repository": "assertion.repository",
    },
  }
);

new gcp.serviceaccount.IAMMember("repository", {
    serviceAccountId: serviceAccount.name,
    role: "roles/iam.workloadIdentityUser",
    member: pulumi.interpolate`principalSet://iam.googleapis.com/${identityPool.name}/attribute.repository/jaxxstorm/secure-cloud-access`
})

new github.ActionsSecret("identityProvider", {
    repository: "secure-cloud-access",
    secretName: "WORKLOAD_IDENTITY_PROVIDER",
    plaintextValue: identityPoolProvider.name,
  });

  new github.ActionsSecret("subscriptionId", {
    repository: "secure-cloud-access",
    secretName: "SERVICE_ACCOUNT_EMAIL",
    plaintextValue: serviceAccount.email,
  });

export const workloadIdentityProviderUrl = identityPoolProvider.name
export const serviceAccountEmail = serviceAccount.email
