const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { HttpsProxyAgent } = require('https-proxy-agent');


function taoSid() {
    return crypto.randomBytes(6).toString('base64').slice(0, 9);
}


const docQuery = path.join(__dirname, 'query.txt');
const xulyQuery = fs.readFileSync(docQuery, 'utf8');
const docProxy = path.join(__dirname, 'proxy.txt');
const xulyProxy = fs.readFileSync(docProxy, 'utf8');
const queryIds = xulyQuery.split('\n').map(line => line.trim()).filter(line => line);
const proxies = xulyProxy.split('\n').map(line => line.trim()).filter(line => line);

if (queryIds.length !== proxies.length) {
    console.error('Số lượng query_id và proxy không khớp nhau.');
    process.exit(1);
}

function checkEnergy(energy) {
    return energy > 30;
}

const checkProxyIP = async (proxy) => {
    try {
        const proxyAgent = new HttpsProxyAgent(proxy);
        const response = await axios.get('https://api.ipify.org?format=json', {
            httpsAgent: proxyAgent
        });
        if (response.status === 200) {
            console.log('\nĐịa chỉ IP của proxy là:', response.data.ip);
        } else {
            console.error('Không thể kiểm tra IP của proxy. Status code:', response.status);
        }
    } catch (error) {
        console.error('Error khi kiểm tra IP của proxy:', error);
    }
};

async function sendTapRequests() {
    for (let i = 0; i < queryIds.length; i++) {
        const queryId = queryIds[i];
        const proxy = proxies[i];
        
        await checkProxyIP(proxy); 

        const queryParams = new URLSearchParams(queryId);
        const userIdMatch = queryParams.get('user').match(/"id":(\d+)/);
        const userId = userIdMatch ? userIdMatch[1] : null;

        if (!userId) {
            console.error('Không tìm thấy user id:', queryId);
            continue;
        }

        const payload1 = {
            sid: taoSid(),
            id: userId,
            auth: queryId.replace(/&/g, '\n')
        };

        const config1 = {
            method: 'post',
            url: 'https://gemzcoin.us-east-1.replicant.gc-internal.net/gemzcoin/v4.3.5/loginOrCreate',
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'Accept-Language': 'vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5',
                'Content-Type': 'application/json',
                'Origin': 'https://ff.notgemz.gemz.fun',
                'Referer': 'https://ff.notgemz.gemz.fun/',
                'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
                'Sec-Ch-Ua-Mobile': '?1',
                'Sec-Ch-Ua-Platform': '"Android"',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'cross-site',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
            },
            data: payload1,
            httpsAgent: new HttpsProxyAgent(proxy)
        };

        try {
            const response1 = await axios(config1);
            const data = response1.data.data;

            if (!data || !data.state || !data.token) {
                console.error('Dữ liệu phản hồi không hợp lệ:', response1.data);
                continue;
            }
            console.log('===================================');
            console.log('Username:', data.state.username);
            console.log('Balance:', data.state.balance);
            console.log('Energy:', data.state.energy);
            console.log('===================================');

            let rev = data.rev;
            let currentEnergy = data.state.energy;

            while (checkEnergy(currentEnergy)) {
                const queueLength = Math.floor(Math.random() * 16) + 5;
                const queue = [];
                for (let i = 0; i < queueLength; i++) {
                    queue.push({"fn": "tap", "async": false, "meta": {"now": Date.now()}});
                }

                const payload2 = {
                    "abTestsDynamicConfig": {
                        "0002_invite_drawer": {"active": true, "rollOut": 1},
                        "0003_invite_url": {"active": true, "rollOut": 1},
                        "0004_invite_copy": {"active": true, "rollOut": 1},
                        "0010_localization": {"active": true, "rollOut": 1},
                        "0006_daily_reward": {"active": false, "rollOut": 0},
                        "0011_earn_page_buttons": {"active": true, "rollOut": 1},
                        "0005_invite_message": {"active": true, "rollOut": 1},
                        "0008_retention_with_points": {"active": true, "rollOut": 1},
                        "0018_earn_page_button_2_friends": {"active": true, "rollOut": 1},
                        "0012_rewards_summary": {"active": true, "rollOut": 1},
                        "0022_localization": {"active": true, "rollOut": 1},
                        "0023_earn_page_button_connect_wallet": {"active": true, "rollOut": 1},
                        "0016_throttling": {"active": true, "rollOut": 1},
                        "0024_rewards_summary2": {"active": true, "rollOut": 1},
                        "0016_throttling_v2": {"active": true, "rollOut": 1},
                        "0014_gift_airdrop": {"active": true, "rollOut": 1}
                    },
                    "queue": queue,
                    "rev": rev,
                    "requestedProfileIds": [],
                    "consistentFetchIds": [],
                    "sid": taoSid(),
                    "clientRandomSeed": 0,
                    "crqid": taoSid(),
                    "id": userId,
                    "auth": data.token
                };

                const config2 = {
                    method: 'post',
                    url: 'https://gemzcoin.us-east-1.replicant.gc-internal.net/gemzcoin/v4.3.5/replicate',
                    headers: {
                        'Accept': 'application/json, text/plain, */*',
                        'Accept-Encoding': 'gzip, deflate, br, zstd',
                        'Accept-Language': 'vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5',
                        'Content-Type': 'application/json',
                        'Origin': 'https://ff.notgemz.gemz.fun',
                        'Referer': 'https://ff.notgemz.gemz.fun/',
                        'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
                        'Sec-Ch-Ua-Mobile': '?1',
                        'Sec-Ch-Ua-Platform': '"Android"',
                        'Sec-Fetch-Dest': 'empty',
                        'Sec-Fetch-Mode': 'cors',
                        'Sec-Fetch-Site': 'cross-site',
                        'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
                    },
                    data: payload2,
                    httpsAgent: new HttpsProxyAgent(proxy)
                };

                try {
                    const response2 = await axios(config2);
                    const responseData = response2.data.data;

                    if (!responseData || !responseData.state) {
                        console.log(`Đang tap... ${JSON.stringify(responseData)}`);
                    }

                    rev = response2.data.data.rev;
                    currentEnergy -= queueLength;

                } catch (error) {
                    console.error('Lỗi rồi:', error.response ? error.response.data : error.message);
                    break; 
                }
            }
        } catch (error) {
            console.error('Lỗi rồi:', error.response ? error.response.data : error.message);
        }
    }

    console.log('Đã chạy hết các tài khoản. Nghỉ 1 phút trước khi tiếp tục...');
    await new Promise(resolve => setTimeout(resolve, 60000));

    sendTapRequests();
}

sendTapRequests();
