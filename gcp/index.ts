import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as google from "@pulumi/google-native";

const serviceAccount = new google.iam.v1.ServiceAccount("github-actions", {
    accountId: "github-actions"
})

new gcp.projects.IAMMember("github-actions", {
    role: "roles/viewer",
    member: pulumi.interpolate`serviceAccount:${serviceAccount.email}`
})

const identityPool = new gcp.iam.WorkloadIdentityPool("github-actions", {
  disabled: false,
  workloadIdentityPoolId: "github-actions-1",
});

const identityPoolProvider = new gcp.iam.WorkloadIdentityPoolProvider(
  "github-actions",
  {
    workloadIdentityPoolId: identityPool.workloadIdentityPoolId,
    workloadIdentityPoolProviderId: "github-actions-1",
    oidc: {
      issuerUri: "https://token.actions.githubusercontent.com",
    },
    attributeMapping: {
      "google.subject": "assertion.sub",
      "attribute.actor": "assertion.actor",
      "attribute.aud": "assertion.aud",
      "attribute.repository": "assertion.repository",
    },
  }
);

new gcp.serviceaccount.IAMMember("repository", {
    serviceAccountId: serviceAccount.name,
    role: "roles/iam.workloadIdentityUser",
    member: pulumi.interpolate`principalSet://iam.googleapis.com/${identityPool.name}/attribute.repository/jaxxstorm/repo`
})

export const workloadIdentityProviderUrl = identityPoolProvider.name
export const serviceAccountEmail = serviceAccount.email
