import os
import unittest
import json
import boto3
from moto import mock_cognitoidp

@mock_cognitoidp
class SettingsTests(unittest.TestCase):
    def setUp(self):
        conn = boto3.client('cognito-idp', region_name='us-east-1')
        user_pool_id = conn.create_user_pool(PoolName='myuserpool')["UserPool"]["Id"]
        username = 'TestUser'
        password = 'P@ssword'
        client_id = conn.create_user_pool_client(
            UserPoolId=user_pool_id,
            ClientName='myappclient',
            ReadAttributes=["email", "phone_number"]
        )["UserPoolClient"]["ClientId"]

        conn.admin_create_user(
            UserPoolId=user_pool_id,
            Username=username,
            TemporaryPassword=password,
            UserAttributes=[{"Name": "phone_number", "Value": "+1234567890"},{"Name": "email", "Value": "user@gmail.com"}],
        )
        conn.confirm_sign_up(
            ClientId=client_id, Username=username, ConfirmationCode="123456",
        )
        os.environ['USER_POOL_ID'] = user_pool_id
        os.environ['APP_CLIENT_ID'] = client_id
        os.environ['REGION' ] = 'us-east-1'

    def test_user_authentication(self):
        with open('event_authentication.json', 'r') as file:
            event = file.read()
            function = __import__('lambda_function')
            response = function.lambda_handler(event = json.loads(event), context = {})
            print(response['response'])
            expected_response = {'userAttributes': {'phone_number': '+1234567890','phone_number_verified': 'true','email': 'user@gmail.com', 'email_verified': 'true'}, 'forceAliasCreation': None, 'finalUserStatus': 'CONFIRMED', 'messageAction': 'SUPPRESS', 'desiredDeliveryMediums': None}
            self.assertEqual(response['response'], expected_response)

    def test_forgot_password(self):
        with open('event_forgotpassword.json', 'r') as file:
            event = file.read()
            function = __import__('lambda_function')
            response = function.lambda_handler(event = json.loads(event), context = {})
            print(response['response'])
            expected_response = {'userAttributes': {'phone_number': '+1234567890','phone_number_verified': 'true','email': 'user@gmail.com', 'email_verified': 'true'}, 'forceAliasCreation': None, 'finalUserStatus': None, 'messageAction': 'SUPPRESS', 'desiredDeliveryMediums': None}
            self.assertEqual(response['response'], expected_response)

if __name__ == '__main__':
    unittest.main()
