const AWS = require('aws-sdk');

var cognitoUserPoolId = process.env.USER_POOL_ID;
var appClientId = process.env.APP_CLIENT_ID;
var region = process.env.REGION;
const cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider({region: region});

//function to fetch user details and add user attributes to event object
async function lookupUser(event){
  var params = {
    UserPoolId: cognitoUserPoolId,
    Username: event.userName
  };
  try{
    var userDetails = {};
    const user = await cognitoidentityserviceprovider.adminGetUser(params).promise();
    user.UserAttributes.forEach(
        element => {
          if (element.Name == "email"){
            userDetails.email = element.Value;
            userDetails.email_verified = "true";
          }
          if(element.Name == "phone_number"){
            userDetails.phone_number = element.Value;
            userDetails.phone_number_verified = "true";
          }
        }
      );
      event.response.userAttributes = userDetails;
      event.response.messageAction = "SUPPRESS";
      if(event.triggerSource == "UserMigration_Authentication" ){
        event.response.finalUserStatus = "CONFIRMED";
      }
      return event;
  }
  catch(err){
    console.log(err);
    return "Failed to get user"
  }
}
//function to authenticate user against the old user pool and ensure tokens are received correctly.
async function authenticateUser(event){
  var params = {
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      ClientId: appClientId,
      UserPoolId: cognitoUserPoolId,
      AuthParameters: {
        'USERNAME': event.userName,
        'PASSWORD': event.request.password
      }
    };
  try{
    const authenticationdetails = await cognitoidentityserviceprovider.adminInitiateAuth(params).promise();
    //make sure no further challenge is returned and user authenticated successfully
    if(!(authenticationdetails.hasOwnProperty("AuthenticationResult"))){
        console.log("Did not receive token - try again with Forgot Password");
        return undefined;
      }
      else {
        return lookupUser(event);
      }
  }
  catch(err){
    console.log(err);
    return "Error occured when authenticating the user.";
  }
}

exports.handler = async(event, context, callback) => {
    event.response.userAttributes = {};

    if ( event.triggerSource == "UserMigration_Authentication" ) {
      return authenticateUser(event);
    }

    else if ( event.triggerSource == "UserMigration_ForgotPassword" ) {
      return lookupUser(event);
    }

    else {
        callback("Bad triggerSource " + event.triggerSource);
    }
};
