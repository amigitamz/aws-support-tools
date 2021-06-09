const AWS = require('aws-sdk')
const AWSMock = require('aws-sdk-mock');
const fs = require('fs');

AWSMock.setSDKInstance(AWS);

AWSMock.mock('CognitoIdentityServiceProvider', 'adminInitiateAuth', function (params, callback){
  response = { ChallengeParameters: {}, AuthenticationResult : { AccessToken : "eyJraWQpvfhNCDRdWJzdVcyUmacjbdjksbcweTFJMlINFDncdcMyNTYifQ", IdToken: "eyJraWQpvfhNCDRdWJzdVcyUmacjbdjksbcweTFJMlINFDncdcMyNTYifQ", RefreshToken: "eyJraWQpvfhNCDRdWJzdVcyUmacjbdjksbcweTFJMlINFDncdcMyNTYifQ"}}
  callback(null, response);
});

AWSMock.mock('CognitoIdentityServiceProvider', 'adminGetUser', function (params, callback){
  response = {
    "Username": "TestUser",
    "Enabled": true,
    "UserStatus": "CONFIRMED",
    "UserAttributes" : [
      {
        "Name": "sub",
        "Value": "1234567890"
      },
      {
          "Name": "email_verified",
          "Value": "false"
      },
      {
          "Name": "phone_number_verified",
          "Value": "false"
      },
      {
          "Name": "phone_number",
          "Value": "+1234567890"
      },
      {
          "Name": "email",
          "Value": "user@gmail.com"
      }
    ]
  }
  callback(null, response);
});

process.env.USER_POOL_ID = 'testuserpool';
process.env.APP_CLIENT_ID = 'testappclient';
process.env.REGION = 'us-east-1';
const index = require('./index')

test('Runs test for user authentication', async () => {
    let eventFile = fs.readFileSync('event_authentication.json')
    let event = JSON.parse(eventFile)
    let response = await index.handler(event, null)
    console.log(response.response)
    expected_response = {'userAttributes': {'phone_number': '+1234567890', 'phone_number_verified': 'true', 'email': 'user@gmail.com', 'email_verified': 'true'}, 'forceAliasCreation': null, 'finalUserStatus': 'CONFIRMED', 'messageAction': 'SUPPRESS', 'desiredDeliveryMediums': null}
    expect(response.response).toEqual(expected_response);
  }
)

test('Runs test for forgot password', async () => {
    let eventFile = fs.readFileSync('event_forgotpassword.json')
    let event = JSON.parse(eventFile)
    let response = await index.handler(event, null)
    console.log(response.response)
    expected_response = {'userAttributes': {'phone_number': '+1234567890', 'phone_number_verified': 'true', 'email': 'user@gmail.com', 'email_verified': 'true'}, 'forceAliasCreation': null, 'finalUserStatus': null, 'messageAction': 'SUPPRESS', 'desiredDeliveryMediums': null}
    expect(response.response).toEqual(expected_response);
  }
)
