import { awscdk, javascript } from "projen";
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: "2.1.0",
  defaultReleaseBranch: "main",
  name: "transfer",
  packageManager: javascript.NodePackageManager.NPM,
  projenrcTs: true,

  deps: ["aws-cdk-lib", "aws-lambda", "hono"],
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  devDeps: ["@types/aws-lambda"],
  // packageName: undefined,  /* The "name" in package.json. */
  context: {
    serviceName: "Transfer",
  },
});
project.addTask("deploy:watch", {
  exec: "npx projen deploy:watch",
});
project.synth();
