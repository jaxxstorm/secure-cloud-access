import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as google from "@pulumi/google-native";

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
  workloadIdentityPoolId: `${name}-3`,
});

const identityPoolProvider = new gcp.iam.WorkloadIdentityPoolProvider(
  "github-actions",
  {
    workloadIdentityPoolId: identityPool.workloadIdentityPoolId,
    workloadIdentityPoolProviderId: `${name}-3`,
    oidc: {
      issuerUri: "https://token.actions.githubusercontent.com",
    },
    attributeMapping: {
      "google.subject": "assertion.repository",
      "attribute.actor": "assertion.actor",
      "attribute.aud": "assertion.aud",
      "attribute.repository": "assertion.repository",
    },
  }
);

new gcp.serviceaccount.IAMMember("repository", {
    serviceAccountId: serviceAccount.name,
    role: "roles/iam.workloadIdentityUser",
    member: pulumi.interpolate`principalSet://iam.googleapis.com/${identityPool.id}/attribute.repository/jaxxstorm/repo`
})

export const workloadIdentityProviderUrl = identityPoolProvider.name
export const serviceAccountEmail = serviceAccount.email
