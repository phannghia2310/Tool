const axios = require('axios');
const https = require('https');
const fs = require('fs');
const ethers = require('ethers');

const headers = {
    "host": "tgapp-api.matchain.io",
    "connection": "keep-alive",
    "accept": "application/json, text/plain, */*",
    "user-agent": "Mozilla/5.0 (Linux; Android 10; Redmi 4A / 5A Build/QQ3A.200805.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/86.0.4240.185 Mobile Safari/537.36",
    "content-type": "application/json",
    "origin": "https://tgapp.matchain.io",
    "x-requested-with": "tw.nekomimi.nekogram",
    "sec-fetch-site": "same-site",
    "sec-fetch-mode": "cors",
    "sec-fetch-dest": "empty",
    "referer": "https://tgapp.matchain.io/",
    "accept-language": "en,en-US;q=0.9"
};

class MatChainClaimer {
    constructor() {
        this.headers = { ...headers };
        this.provider = new ethers.JsonRpcProvider('https://rpc.matchain.io');
        this.contractAddress = '0x618f7Bf3e4f331D8157ddD346A2c0dD8C19Ac964';
        this.contractABI = [
            {
                "inputs": [
                    { "internalType": "bytes", "name": "signature", "type": "bytes" }
                ],
                "name": "claimWithVerifierSignature",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }
        ];
    }

    cleanString(str) {
        return str.replace(/[\r\n]+/g, '').trim();
    }

    readAndCleanFile(filepath) {
        return fs.readFileSync(filepath, 'utf-8')
            .split(/\r?\n/)
            .map(line => this.cleanString(line))
            .filter(line => line.length > 0);
    }

    async http(url, headers, data = null) {
        const config = {
            headers,
            httpsAgent: new https.Agent({
                rejectUnauthorized: false
            })
        };

        try {
            const res = data
                ? await axios.post(url, data, config)
                : await axios.get(url, config);
            return res;
        } catch (error) {
            console.error(`HTTP request error: ${error.message}`);
            throw error;
        }
    }

    async claimSignature(token, walletAddress) {
        try {
            const claimUrl = "https://tgapp-api.matchain.io/api/tgapp/v1/wallet/claim/fomo";
            const headers = { ...this.headers, authorization: token };
            const payload = { address: this.cleanString(walletAddress) };
            const res = await this.http(claimUrl, headers, JSON.stringify(payload));

            if (res.status === 200 && res.data?.data) {
                return this.cleanString(res.data.data);
            } else {
                throw new Error('Failed to claim signature from API');
            }
        } catch (error) {
            console.error('Claim signature error:', error.message);
            throw error;
        }
    }

    async executeContract(privateKey, signature) {
        try {
            const cleanPrivateKey = this.cleanString(privateKey);

            const wallet = new ethers.Wallet(cleanPrivateKey, this.provider);
            const contract = new ethers.Contract(
                this.contractAddress,
                this.contractABI,
                wallet
            );

            console.log('Calling contract with signature:', signature);

            const tx = await contract.claimWithVerifierSignature(signature);
            return await tx.wait();
        } catch (error) {
            console.error('Execute contract error:', error.message);
            throw error;
        }
    }

    async processAccount(loginData, walletAddress, privateKey) {
        try {
            const cleanWallet = this.cleanString(walletAddress);
            console.log(`Xử lý tài khoản bằng ví: ${cleanWallet}`);

            const token = await this.login(loginData);
            if (!token) {
                console.error('Login failed');
                return;
            }

            const signature = await this.claimSignature(token, cleanWallet);
            console.log('Signature received:', signature);

            const receipt = await this.executeContract(privateKey, signature);
            console.log(`Transaction successful. Hash: ${receipt.transactionHash}`);
        } catch (error) {
            console.error(`Error processing account: ${error.message}`);
        }
    }

    async login(tg_login_params) {
        try {
            const cleanedParams = this.cleanString(tg_login_params);
            
            const params = new URLSearchParams(cleanedParams);
            const userEncoded = params.get('user');
            const user = JSON.parse(decodeURIComponent(userEncoded));

            const url = "https://tgapp-api.matchain.io/api/tgapp/v1/user/login";
            const payload = {
                uid: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                username: user.username,
                tg_login_params: cleanedParams
            };
            
            const res = await this.http(url, this.headers, JSON.stringify(payload));
            if (res.status !== 200 || !res.data?.data?.token) {
                console.error('Login failed or token not found');
                return null;
            }

            console.log('Login successful');
            return res.data.data.token;
        } catch (error) {
            console.error('Login error:', error.message);
            return null;
        }
    }

    async main() {
        const loginData = this.readAndCleanFile('data.txt');
        const walletAddresses = this.readAndCleanFile('wallet.txt');
        const privateKeys = this.readAndCleanFile('private.txt');

        console.log(`Tìm thấy ${loginData.length} tài khoản để xử lý`);

        for (let i = 0; i < loginData.length; i++) {
            console.log(`\nXử lý tài khoản ${i + 1}/${loginData.length}`);
            await this.processAccount(loginData[i], walletAddresses[i], privateKeys[i]);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

if (require.main === module) {
    const claimer = new MatChainClaimer();
    claimer.main().catch(console.error);
}
