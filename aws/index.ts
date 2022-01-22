import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const oidcProvider = new aws.iam.OpenIdConnectProvider("secure-cloud-access", {
  thumbprintLists: ["6938fd4d98bab03faadb97b34396831e3780aea1"],
  clientIdLists: ["https://github.com/jaxxstorm", "sts.amazonaws.com"],
  url: "https://token.actions.githubusercontent.com",
});

const role = new aws.iam.Role("secure-cloud-access", {
  description: "Access for github.com/jaxxstorm/secure-cloud-access",
  assumeRolePolicy: {
    Version: "2012-10-17",
    Statement: [
      {
        Action: ["sts:AssumeRoleWithWebIdentity"],
        Effect: "Allow",
        Condition: {
          StringLike: {
            "token.actions.githubusercontent.com:sub":
              "repo:jaxxstorm/secure-cloud-access:*",
          },
        },
        Principal: {
          Federated: [oidcProvider.arn],
        },
      },
    ],
  } as aws.iam.PolicyDocument,
});

const partition = aws.getPartition();

partition.then((p) => {
  new aws.iam.PolicyAttachment("readOnly", {
    policyArn: `arn:${p.partition}:iam::aws:policy/ReadOnlyAccess`,
    roles: [role.name],
  });
});

export const roleArn = role.arn;
