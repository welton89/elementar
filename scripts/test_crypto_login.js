const sdk = require("matrix-js-sdk");
const { LocalStorage } = require("node-localstorage");
const localStorage = new LocalStorage("./scratch");

// Polyfills setup mimicking the RN environment
// require("weak-ref"); // Node.js likely has FinalizationRegistry built-in
global.TextEncoder = require("util").TextEncoder;
global.TextDecoder = require("util").TextDecoder;
// Node.js crypto is usually sufficient, but let's see if we need to polyfill it for the SDK
// global.crypto = require("crypto").webcrypto; // Node 15+

async function testLogin() {
    console.log("--- Iniciando Teste de Login e Criptografia ---");

    try {
        // 1. Tentar carregar o módulo de criptografia
        console.log("1. Carregando módulo de criptografia...");
        const cryptoProvider = require("@matrix-org/matrix-sdk-crypto-js");
        console.log("   Módulo carregado com sucesso!");
    } catch (e) {
        console.error("   ERRO FATAL: Não foi possível carregar @matrix-org/matrix-sdk-crypto-js");
        console.error(e);
        return;
    }

    const client = sdk.createClient({
        baseUrl: "https://matrix.org",
    });

    try {
        // 2. Login
        console.log("2. Realizando login...");
        const response = await client.login("m.login.password", {
            user: "weltonmoura",
            password: "M@ximo130468",
        });
        console.log("   Login realizado com sucesso! UserID:", response.user_id);

        // Configurar cliente autenticado
        const authClient = sdk.createClient({
            baseUrl: "https://matrix.org",
            accessToken: response.access_token,
            userId: response.user_id,
            deviceId: response.device_id,
            sessionStore: new sdk.MemoryStore({ localStorage }),
            cryptoStore: new sdk.MemoryCryptoStore(),
        });

        // 3. Inicializar Criptografia
        // 3. Inicializar Criptografia
        console.log("3. Inicializando criptografia...");
        console.log("   Métodos disponíveis:", Object.keys(authClient).filter(k => k.includes("init")));
        console.log("   Prototype methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(authClient)).filter(k => k.includes("init")));

        if (authClient.initRustCrypto) {
            console.log("   Usando initRustCrypto...");
            await authClient.initRustCrypto();
        } else if (authClient.initCrypto) {
            console.log("   Usando initCrypto...");
            await authClient.initCrypto();
        } else {
            console.error("   Nenhum método de inicialização de criptografia encontrado!");
        }
        console.log("   Criptografia inicializada com sucesso!");

        // 4. Verificar status
        const isCryptoEnabled = authClient.isCryptoEnabled();
        console.log("   isCryptoEnabled():", isCryptoEnabled);

        if (isCryptoEnabled) {
            console.log("--- TESTE BEM SUCEDIDO: Criptografia Ativa ---");
        } else {
            console.error("--- FALHA: Criptografia não está ativa após initCrypto ---");
        }

        // Logout para limpar
        await authClient.logout();

    } catch (error) {
        console.error("--- ERRO DURANTE O TESTE ---");
        console.error(error);
    }
}

testLogin();
