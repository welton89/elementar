const sdk = require('@unomed/react-native-matrix-sdk');

console.log('SDK Exports:', Object.keys(sdk));

if (sdk.Client) {
    console.log('Client static methods:', Object.getOwnPropertyNames(sdk.Client));
    console.log('Client prototype methods:', Object.getOwnPropertyNames(sdk.Client.prototype));
}

if (sdk.ClientBuilder) {
    console.log('ClientBuilder prototype methods:', Object.getOwnPropertyNames(sdk.ClientBuilder.prototype));
}
