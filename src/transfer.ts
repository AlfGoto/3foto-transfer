import * as cdk from "aws-cdk-lib"
import * as ddb from "aws-cdk-lib/aws-dynamodb"
import * as apigw from "aws-cdk-lib/aws-apigatewayv2"
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as ln from "aws-cdk-lib/aws-lambda-nodejs"
import * as logs from "aws-cdk-lib/aws-logs"
import * as s3 from "aws-cdk-lib/aws-s3"
import { Construct } from "constructs"

export interface TransferProps extends cdk.StackProps {
  stage: string
  serviceName: string
}

export class Transfer extends cdk.Stack {
  constructor(scope: Construct, id: string, props: TransferProps) {
    super(scope, id, props)

    const table = new ddb.TableV2(this, "TransferTable", {
      partitionKey: { name: "PK", type: ddb.AttributeType.STRING },
      sortKey: { name: "SK", type: ddb.AttributeType.STRING },
      dynamoStream: ddb.StreamViewType.NEW_AND_OLD_IMAGES,
      billing: ddb.Billing.onDemand(),
      removalPolicy: props.stage === "prod" ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: "ttl",
    })

    const bucket = new s3.Bucket(this, "bucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      autoDeleteObjects: props.stage.startsWith("test"),
      removalPolicy: props.stage === "prod" ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
        },
      ],
    })

    const api = new apigw.HttpApi(this, "TransferApi", {
      corsPreflight: {
        allowHeaders: ["Content-Type", "Authorization", "Content-Length", "X-Requested-With"],
        allowMethods: [apigw.CorsHttpMethod.ANY],
        allowCredentials: false,
        allowOrigins: ["*"],
      },
    })
    const apiFunction = new ln.NodejsFunction(this, "ApiFunction", {
      entry: `${__dirname}/api/index.ts`,
      environment: {
        STAGE: props.stage,
        SERVICE: props.serviceName,
        NODE_OPTIONS: "--enable-source-maps",
        BUCKET_NAME: bucket.bucketName,
        TABLE_NAME: table.tableName,
      },
      bundling: { minify: true, sourceMap: true },
      runtime: lambda.Runtime.NODEJS_18_X,
      architecture: lambda.Architecture.ARM_64,
      logRetention: logs.RetentionDays.THREE_DAYS,
      tracing: lambda.Tracing.ACTIVE,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    })
    bucket.grantRead(apiFunction)
    table.grantReadWriteData(apiFunction)

    const apiIntegration = new integrations.HttpLambdaIntegration("ApiIntegration", apiFunction)
    api.addRoutes({
      path: "/{proxy+}",
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST],
      integration: apiIntegration,
      // authorizer: undefined,
    })
  }
}
