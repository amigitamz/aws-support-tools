# CognitoUserMigrationLambda

## Use Case

Sometimes there might be a need to create a new Cognito user pool and seamlessly migrate users from old user pool to new user pool. A common scenario where this happens is when you have to update some immutable configurations in the user pool, such as moving an attribute from required to non-required and for such changes you need to create a completely new user pool and migrate users to the new user pool. User Migration Lambda provides a way to seamlessly migrate users from one user pool to another and users can continue to use their old username/password combination.

## Short description

This repository contains Python and Node.js code samples for user migration lambda function. This Lambda function will be triggered during first sign-in or forgot-password process. Detailed steps for the sign-in flow are give here - https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-import-using-lambda.html

Based on the event that triggered the Lambda(UserMigration_Authentication or UserMigration_ForgotPassword), appropriate steps need to be taken.

For first sign-in event, i.e. UserMigration_Authentication, the user will be authenticated against the old user pool using username and password received in the event request parameter and if the user is authenticated successfully, then the user details are extracted and added in response parameter.

For forgot password event, i.e. UserMigration_ForgotPassword, user details are extracted by making a call to the old user pool using the username field received in the event request parameter. The user details will then be sent as part of response parameters.

Based on the user attributes received in the response parameter, Cognito will create a new user in the new user pool.

For additional details on request and response parameter, please refer to the documentation given on this link - https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-migrate-user.html

## Considerations

1. The given sample makes AdminInitiateAuth API call with ADMIN_USER_PASSWORD_AUTH authentication flow to authenticate the user against old user pool. AdminInitiateAuth call should return tokens once the call is made and no further challenge such as MFA should be thrown. If the call returns a challenge instead of tokens, the request will fail and user will have to go through ForgotPassword flow.

2. The given code sample assumes that app client of source user pool does not have client secret enabled.

3. The sample shows how user attributes such as email, phone_number, email_verified and phone_number_verified can also be migrated by setting their values. You can update the code to migrate any other attributes that you may require.

4. For fetching user details, the given code uses AdminGetUser call. You may also use GetUser call instead or decode the ID/Access tokens to read user claims, however, this will only work in case of sign-in flow and not forgot password.
g
5. The code sample sets finalUserStatus to CONFIRMED for sign-in event and messageAction to SUPPRESS for both sign-in and forgot-password events. finalUserStatus=CONFIRMED allows users to use the same username/password and sets the status to CONFIRMED. messageAction=SUPPRESS will prevent welcome message from being sent to the user when the user is first created in new user pool.

6. The given code can be used for migrating users across user pools in different regions but not across accounts.

## Pre-requisites

1. Node.js 14 with npm for Node.js user migration lambda sample OR Python 3.7 for Python user migration lambda sample (only required if you are setting up through AWS CloudFormation)

2. Install and configure AWS CLI (v1.17 or higher) (only required if you are setting up through AWS CloudFormation)

3. Both the user pools should be created before hand and user migration lambda has to be attached to the new user pool, i.e. the user pool in which you want to migrate the users.

4. If your app has a native sign-in UI and uses the Cognito Identity Provider SDK, you must enable USER_PASSWORD_AUTH on the new user pool in order for user migration lambda to receive username and password in the event. After the users have migrated, you should turn it off.

## Test

For Python, run the below given commands. -
```
cd python
pip3 install -r requirements.txt
python3 -m unittest test.py
```

For Node.js, run the below given commands -
```
cd nodejs
npm install
npm run test
```

The tests should print the below given JSON objects in result -
```
{'userAttributes': {'phone_number': '+1234567890', 'phone_number_verified': 'true', 'email': 'user@gmail.com', 'email_verified': 'true'}, 'forceAliasCreation': None, 'finalUserStatus': None, 'messageAction': 'SUPPRESS', 'desiredDeliveryMediums': None}
{'userAttributes': {'phone_number': '+1234567890', 'phone_number_verified': 'true', 'email': 'user@gmail.com', 'email_verified': 'true'}, 'forceAliasCreation': None, 'finalUserStatus': 'CONFIRMED', 'messageAction': 'SUPPRESS', 'desiredDeliveryMediums': None}
```

## Deploy

You can create Lambda function either using AWS CloudFormation by making use of the template files and commands shared below or you can simple create one through AWS console using the steps shared here.

### Using AWS CloudFormation

1. Download or clone the project from Github
```
git clone <URL>
cd cognitousermigrationlambda
```

2. Create an S3 bucket which will store the artifacts
```
aws s3 mb s3://<BUCKET_NAME>
```

3. Package the local artifacts that the template references and upload it to S3 bucket by running either of the below given command based on your Lambda runtime preference. Replace <BUCKET_NAME> with name of S3 bucket that was created in previous step.

For Python -
```
cd python
aws cloudformation package --template-file python_template.yaml --s3-bucket <BUCKET_NAME> --output-template-file output.yaml
```

For Node.js -
```
cd nodejs
aws cloudformation package --template-file js_template.yaml --s3-bucket <BUCKET_NAME> --output-template-file output.yaml
```

4. Deploy the specified AWS CloudFormation template by running the given command. Replace <USER_POOL_ID>, <APP_CLIENT_ID> and <REGION> with actual values for your old user pool from which you are migrating the users. For example -

| Key           | Value                     |
| ------------- | --------------------------|
| APP_CLIENT_ID | 4bjxxxxxxxxxxxxxxxxxxxx2u |
| USER_POOL_ID  |  us-east-1_xxxxxxxxx      |
| REGION        |  us-east-1                |

```
aws cloudformation deploy --template-file output.yaml --stack-name cognito-user-migration-lambda --parameter-overrides "UserPoolId=<USER_POOL_ID>" "AppClientId=<APP_CLIENT_ID>" "Region=<REGION>" --capabilities CAPABILITY_IAM
```

Once the stack has deployed successfully, Lambda function and an execution role for that function will be created in your account. Attach this Lambda function to your destination user pool as "User Migration" trigger and test it out by signing the user through Hosted UI or your custom UI.

Note - Users should be in CONFIRMED status to follow the

### Using AWS Console

1. Create a Lambda function with appropriate runtime (python3.7+ or nodejs14.x).

2. Give the Lambda function permissions to make calls to your old Cognito User Pool from which you will be migrating the users. Region and user pool id should be of your old user pool only. Here is a sample policy that gives Lambda function permissions to make AdminInitiateAuth and AdminGetUser calls against a user pool and also push logs to CloudWatch -
```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "1",
            "Effect": "Allow",
            "Action": [
                "cognito-idp:AdminInitiateAuth",
                "cognito-idp:AdminGetUser"
            ],
            "Resource": "arn:aws:cognito-idp:<region>:<account_id>:userpool/<user_pool_id>"
        },
        {
            "Sid": "2"
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "*"
        }
    ]
}
```
3. From Configurations, go to Environment Variables and set environment variables for USER_POOL_ID, APP_CLIENT_ID and REGION and set values for each of them. It is important to note that the values here will be from the old user pool from which we are migrating the users and not the newly created user pool. For example -

| Key           | Value                     |
| ------------- | --------------------------|
| APP_CLIENT_ID | 4bjxxxxxxxxxxxxxxxxxxxx2u |
| USER_POOL_ID  |  us-east-1_xxxxx          |
| REGION        |  us-east-1                |


4. To add the code for Lambda function, navigate to Code and add the sample code(python/lambda_function.py or nodejs/index.js) in the handler file. Click on Deploy to deploy the code changes.

5. From Cognito console, go to your new user pool and click on Triggers. Navigate to User Migration and from drop down, select the newly created lambda function and click on save changes.

6. Test the changes by logging in as a user from old user pool using either Hosted UI or your custom UI and a new user should get added to your new user pool.
