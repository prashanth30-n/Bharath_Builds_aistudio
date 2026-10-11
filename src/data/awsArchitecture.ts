export const AWS_SAM_TEMPLATE = `AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: >
  SurakshaRide - Heat-Safety Companion for Delivery Riders
  Track: Heat & Water | Bharat Builds Hackathon 2026

Globals:
  Function:
    Timeout: 10
    Runtime: python3.12
    MemorySize: 256
    Environment:
      Variables:
        TABLE_HEAT_GRID: !Ref HeatGridTable
        TABLE_RIDERS: !Ref RidersTable
        TABLE_SHIFTS: !Ref ShiftsTable
        TABLE_PINGS: !Ref PingsTable
        TABLE_POINTS: !Ref PointsTable
        S3_ASSETS_BUCKET: !Ref AssetsBucket
        REGION: !Ref "AWS::Region"

Resources:
  # -------------------------------------------------------------
  # S3 Storage for Map GeoJSON Layers, Polly MP3s & Replay Archive
  # -------------------------------------------------------------
  AssetsBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub "suraksha-ride-assets-\${AWS::AccountId}-\${AWS::Region}"
      PublicAccessBlockConfiguration:
        BlockPublicAcls: false
        BlockPublicPolicy: false
        IgnorePublicAcls: false
        RestrictPublicBuckets: false
      CorsConfiguration:
        CorsRules:
          - AllowedHeaders: ['*']
            AllowedMethods: [GET, HEAD]
            AllowedOrigins: ['*']

  # -------------------------------------------------------------
  # DynamoDB Tables (On-Demand Billing, Sub-Millisecond Latency)
  # -------------------------------------------------------------
  HeatGridTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: SurakshaRide-HeatGrid
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: cellId
          AttributeType: S
        - AttributeName: hour
          AttributeType: S
      KeySchema:
        - AttributeName: cellId
          KeyType: HASH
        - AttributeName: hour
          KeyType: RANGE
      TimeToLiveSpecification:
        AttributeName: ttl
        Enabled: true

  RidersTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: SurakshaRide-Riders
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: riderId
          AttributeType: S
      KeySchema:
        - AttributeName: riderId
          KeyType: HASH

  ShiftsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: SurakshaRide-Shifts
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: riderId
          AttributeType: S
        - AttributeName: shiftId
          AttributeType: S
      KeySchema:
        - AttributeName: riderId
          KeyType: HASH
        - AttributeName: shiftId
          KeyType: RANGE

  PingsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: SurakshaRide-Pings
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: shiftId
          AttributeType: S
        - AttributeName: ts
          AttributeType: N
      KeySchema:
        - AttributeName: shiftId
          KeyType: HASH
        - AttributeName: ts
          KeyType: RANGE
      TimeToLiveSpecification:
        AttributeName: ttl
        Enabled: true

  PointsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: SurakshaRide-Points
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: pointId
          AttributeType: S
        - AttributeName: cellId
          AttributeType: S
      KeySchema:
        - AttributeName: pointId
          KeyType: HASH
      GlobalSecondaryIndexes:
        - IndexName: CellIdIndex
          KeySchema:
            - AttributeName: cellId
              KeyType: HASH
          Projection:
            ProjectionType: ALL

  # -------------------------------------------------------------
  # HTTP API Gateway (Low Latency, Minimal Cost)
  # -------------------------------------------------------------
  RiderHttpApi:
    Type: AWS::Serverless::HttpApi
    Properties:
      CorsConfiguration:
        AllowOrigins: ['*']
        AllowMethods: [GET, POST, OPTIONS]
        AllowHeaders: ['*']

  # -------------------------------------------------------------
  # Lambda Functions
  # -------------------------------------------------------------
  BuildGridFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: backend/build_grid/
      Handler: app.lambda_handler
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref HeatGridTable
        - S3CrudPolicy:
            BucketName: !Ref AssetsBucket
      Events:
        HourlyEventBridgeSchedule:
          Type: ScheduleV2
          Properties:
            ScheduleExpression: "cron(5 * * * ? *)"
            Description: "Rebuilds city WBGT heat grid at :05 every hour"

  PingHandlerFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: backend/ping/
      Handler: app.lambda_handler
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref ShiftsTable
        - DynamoDBCrudPolicy:
            TableName: !Ref PingsTable
        - DynamoDBReadPolicy:
            TableName: !Ref HeatGridTable
        - DynamoDBReadPolicy:
            TableName: !Ref PointsTable
      Events:
        PingApi:
          Type: HttpApi
          Properties:
            ApiId: !Ref RiderHttpApi
            Path: /shifts/{id}/ping
            Method: POST

Outputs:
  ApiEndpoint:
    Description: "HTTP API Gateway endpoint URL"
    Value: !Sub "https://\${RiderHttpApi}.execute-api.\${AWS::Region}.amazonaws.com"
  S3BucketName:
    Description: "S3 Bucket storing GeoJSON grids & Polly voice audio"
    Value: !Ref AssetsBucket
`;
