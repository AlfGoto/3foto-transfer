import * as cdk from "aws-cdk-lib"
import * as ddb from "aws-cdk-lib/aws-dynamodb"
import * as apigw from "aws-cdk-lib/aws-apigatewayv2"
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as ln from "aws-cdk-lib/aws-lambda-nodejs"
import * as levs from "aws-cdk-lib/aws-lambda-event-sources"
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
          allowedMethods: [
            s3.HttpMethods.PUT,
            s3.HttpMethods.HEAD,
            s3.HttpMethods.GET,
          ],
          allowedOrigins: [
            "http://localhost:3000",
            "https://dev-3foto.vercel.app",
            "https://3foto.vercel.app",
            "https://transfair.vercel.app",
            "https://dev.transfair.vercel.app",
          ],
          allowedHeaders: ["*"],
          exposedHeaders: [
            "ETag",
            "Content-Length",
            "x-amz-server-side-encryption",
          ],
        },
      ],
    })

    const trigger = new ln.NodejsFunction(this, "Trigger", {
      entry: "src/functions/trigger.ts",
      environment: {
        STAGE: props.stage,
        SERVICE: props.serviceName,
        TABLE_NAME: table.tableName,
        BUCKET_NAME: bucket.bucketName,
      },
      runtime: lambda.Runtime.NODEJS_18_X,
      architecture: lambda.Architecture.ARM_64,
      logRetention: logs.RetentionDays.THREE_DAYS,
      tracing: lambda.Tracing.ACTIVE,
      timeout: cdk.Duration.minutes(1),
      memorySize: 512,
      events: [
        new levs.DynamoEventSource(table, {
          startingPosition: lambda.StartingPosition.TRIM_HORIZON,
          bisectBatchOnError: true,
          reportBatchItemFailures: true,
          retryAttempts: 3,
        }),
      ],
    })
    table.grantReadWriteData(trigger)
    bucket.grantReadWrite(trigger)

    const api = new apigw.HttpApi(this, "TransferApi", {
      corsPreflight: {
        allowHeaders: ["Content-Type", "credentials", "Cookie"],
        allowMethods: [apigw.CorsHttpMethod.ANY],
        allowOrigins: [
          "http://localhost:3000",
          "https://dev-3foto.vercel.app",
          "https://3foto.vercel.app",
          "https://transfair.vercel.app",
          "https://dev.transfair.vercel.app",
        ],
        allowCredentials: true,
      },
    })
    const apiFunction = new ln.NodejsFunction(this, "ApiFunction", {
      entry: `${__dirname}/functions/api/index.ts`,
      environment: {
        STAGE: props.stage,
        SERVICE: props.serviceName,
        NODE_OPTIONS: "--enable-source-maps",
        BUCKET_NAME: bucket.bucketName,
        TABLE_NAME: table.tableName,
      },
      bundling: { minify: true, sourceMap: true },
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      logRetention: logs.RetentionDays.THREE_DAYS,
      tracing: lambda.Tracing.ACTIVE,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    })
    bucket.grantReadWrite(apiFunction)
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
