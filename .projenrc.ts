import { awscdk, javascript } from "projen"
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: "2.1.0",
  defaultReleaseBranch: "main",
  name: "transfer",
  packageManager: javascript.NodePackageManager.NPM,
  projenrcTs: true,

  deps: [
    "@aws-lambda-powertools/batch",
    "@aws-sdk/s3-request-presigner",
    "@aws-sdk/client-dynamodb",
    "@aws-sdk/lib-dynamodb",
    "aws-cdk-lib",
    "aws-lambda",
    "hono",
    "jsonwebtoken",
    "@aws-sdk/client-s3",
    "dynamodb-toolbox",
    "date-fns",
    "uuid",
  ],
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  devDeps: ["@types/aws-lambda", "@types/jsonwebtoken"],
  // packageName: undefined,  /* The "name" in package.json. */
  context: {
    serviceName: "Transfer",
  },
})
project.addTask("deploy:watch", {
  exec: "npx projen deploy:watch",
})
project.synth()
