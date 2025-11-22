// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add crypto polyfill for matrix-js-sdk E2EE support
// Only add if react-native-quick-crypto is installed
try {
    const crypto = require.resolve('react-native-quick-crypto');
    config.resolver.extraNodeModules = {
        ...config.resolver.extraNodeModules,
        crypto: crypto,
    };
} catch (e) {
    console.log('react-native-quick-crypto not found, E2EE may not work');
}

module.exports = config;
