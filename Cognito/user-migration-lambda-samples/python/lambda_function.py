# Copyright 2021-2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file
# except in compliance with the License. A copy of the License is located at
#
#     http://aws.amazon.com/apache2.0/
#
# or in the "license" file accompanying this file. This file is distributed on an "AS IS"
# BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# License for the specific language governing permissions and limitations under the License.
import boto3
import os

user_pool_id = os.environ['USER_POOL_ID']
client_id = os.environ['APP_CLIENT_ID']
region = os.environ['REGION']
client = boto3.client('cognito-idp', region)

#function to authenticate user against the old user pool and ensure tokens are received correctly.
def authenticate_user(event):
    try:
        user = client.admin_initiate_auth(
            UserPoolId = user_pool_id,
            ClientId = client_id,
            AuthFlow = 'ADMIN_USER_PASSWORD_AUTH',
            AuthParameters = {
                'USERNAME': event['userName'],
                'PASSWORD': event['request']['password']
            }
        )
        #Check if no further challenges remain and we are able to get the tokens back successfully
        if ('AuthenticationResult' not in user.keys()):
            print("Received additional challenges")
            return('Please reset password with forgot password')
        else:
            return lookup_user(event)

    except Exception as err:
        print(err)
        return('Error occured when authenticating the user.')

#function to fetch user details and add user attributes to event object
def lookup_user(event):
    try:
        user = client.admin_get_user(
            UserPoolId = user_pool_id,
            Username = event['userName']
        )
        event['response']['userAttributes'] = {}
        if (user):
            for userAttribute in user['UserAttributes']:
                if userAttribute['Name'] == 'email':
                    event['response']['userAttributes']['email'] = userAttribute['Value']
                    event['response']['userAttributes']['email_verified'] = "true"

                if userAttribute['Name'] == 'phone_number':
                    event['response']['userAttributes']['phone_number'] = userAttribute['Value']
                    event['response']['userAttributes']['phone_number_verified'] = "true"

            if(event['triggerSource'] == 'UserMigration_Authentication'):
                event['response']['finalUserStatus'] = "CONFIRMED"

            event['response']['messageAction'] = "SUPPRESS"
            return(event)
    except Exception as err:
        print(err)
        return('Failed to get user')


def lambda_handler(event, context):
    user = {}
    if (event['triggerSource'] == 'UserMigration_Authentication'):
        return authenticate_user(event)

    elif (event["triggerSource"] == "UserMigration_ForgotPassword"):
        return lookup_user(event)

    else:
        print('Bad trigger source'+event['triggerSource'])
        return('Bad trigger source')
