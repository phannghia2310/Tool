const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');
const { DateTime } = require('luxon');
const { HttpsProxyAgent } = require('https-proxy-agent');

class HexnClicker {
    constructor() {
        this.proxies = this.loadProxies();
    }

    loadProxies() {
        const proxyFile = path.join(__dirname, 'proxy.txt');
        return fs.readFileSync(proxyFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);
    }

    headers() {
        return {
            "Accept": "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
            "Content-Type": "application/json",
            "Origin": "https://tgapp.hexn.io",
            "Sec-Ch-Ua": '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-site",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        }
    }

    async checkProxyIP(proxy) {
        try {
            const proxyAgent = new HttpsProxyAgent(proxy);
            const response = await axios.get('https://api.ipify.org?format=json', { httpsAgent: proxyAgent });
            if (response.status === 200) {
                return response.data.ip;
            } else {
                throw new Error(`Không thể kiểm tra IP của proxy. Status code: ${response.status}`);
            }
        } catch (error) {
            throw new Error(`Error khi kiểm tra IP của proxy: ${error.message}`);
        }
    }

    async makeRequest(method, url, payload, proxyIndex) {
        const headers = this.headers();
        const proxy = this.proxies[proxyIndex];
        const httpsAgent = new HttpsProxyAgent(proxy);
        const config = { 
            method, 
            url, 
            headers, 
            httpsAgent,
            ...(payload && { data: payload })
        };
        return axios(config);
    }

    async getState(fingerprint, fingerprint_2, init_data, proxyIndex) {
        const url = "https://clicker.hexn.io/v1/state";
        const payload = { fingerprint, fingerprint_2, init_data };
        return this.makeRequest('post', url, payload, proxyIndex);
    }

    async startFarming(fingerprint, fingerprint_2, init_data, proxyIndex) {
        const url = "https://clicker.hexn.io/v1/farming/start";
        const payload = { fingerprint, fingerprint_2, init_data };
        return this.makeRequest('post', url, payload, proxyIndex);
    }

    async claimFarming(fingerprint, fingerprint_2, init_data, proxyIndex) {
        const url = "https://clicker.hexn.io/v1/farming/claim";
        const payload = { fingerprint, fingerprint_2, init_data };
        return this.makeRequest('post', url, payload, proxyIndex);
    }

    async applyFarmingBooster(fingerprint, fingerprint_2, init_data, booster_id, proxyIndex) {
        const url = "https://clicker.hexn.io/v1/apply-farming-booster";
        const payload = { fingerprint, fingerprint_2, init_data, booster_id };
        return this.makeRequest('post', url, payload, proxyIndex);
    }

    async startQuest(fingerprint, fingerprint_2, init_data, quest_id, proxyIndex) {
        const url = "https://clicker.hexn.io/v1/executed-quest/start";
        const payload = { fingerprint, fingerprint_2, init_data, quest_id };
        return this.makeRequest('post', url, payload, proxyIndex);
    }

    async claimQuest(fingerprint, fingerprint_2, init_data, quest_id, proxyIndex) {
        const url = "https://clicker.hexn.io/v1/executed-quest/claim";
        const payload = { fingerprint, fingerprint_2, init_data, quest_id };
        return this.makeRequest('post', url, payload, proxyIndex);
    }

    log(msg) {
        console.log(`[*] ${msg}`);
    }

    async countdown(t) {
        for (let i = t; i > 0; i--) {
            const hours = String(Math.floor(i / 3600)).padStart(2, '0');
            const minutes = String(Math.floor((i % 3600) / 60)).padStart(2, '0');
            const seconds = String(i % 60).padStart(2, '0');
            process.stdout.write(colors.white(`[*] Cần chờ ${hours}:${minutes}:${seconds}     \r`));
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        process.stdout.write('                                        \r');
    }

    async processQuests(fingerprint, fingerprint_2, init_data, quests, executedQuests, proxyIndex) {
        const skipQuestIds = [28, 139, 178];
    
        for (const [questId, questData] of Object.entries(quests)) {
            if (!executedQuests[questId] && !skipQuestIds.includes(parseInt(questId))) {
                try {
                    await this.startQuest(fingerprint, fingerprint_2, init_data, parseInt(questId), proxyIndex);
                    const claimResponse = await this.claimQuest(fingerprint, fingerprint_2, init_data, parseInt(questId), proxyIndex);
                    if (claimResponse.data && claimResponse.data.status === "OK") {
                        const reward = claimResponse.data.data.balance;
                        this.log(`Làm nhiệm vụ ${questData.description} thành công | phần thưởng ${reward}`.green);
                    } else {
                        this.log(`Làm nhiệm vụ ${questData.description} thất bại`.red);
                    }
                } catch (error) {
                    this.log(`Lỗi khi xử lý nhiệm vụ ${questData.description}`.red);
                    console.log(error);
                }
            } else if (skipQuestIds.includes(parseInt(questId))) {
//                this.log(`Bỏ qua nhiệm vụ ${questData.description}`.yellow);
            }
        }
    }    

    async main() {
        const dataFile = path.join(__dirname, 'data.txt');
        const data = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);

        while (true) {
            const start = Math.floor(Date.now() / 1000);
            const listCountdown = [];

            for (let i = 0; i < data.length; i++) {
                const [fingerprint, fingerprint_2, init_data] = data[i].split('|');
                const proxyIndex = i % this.proxies.length;

                try {
                    const userDataStr = init_data.split('user=')[1].split('&')[0];
                    const userData = JSON.parse(decodeURIComponent(userDataStr));
                    const firstName = userData.first_name;

                    let proxyIP;
                    try {
                        proxyIP = await this.checkProxyIP(this.proxies[proxyIndex]);
                    } catch (error) {
                        this.log(`Lỗi khi kiểm tra IP của proxy: ${error.message}`.red);
                        continue;
                    }

                    console.log(`========== Tài khoản ${i + 1} | ${firstName.green} | ip: ${proxyIP} ==========`);

                    const stateResponse = await this.getState(fingerprint, fingerprint_2, init_data, proxyIndex);
                    const stateData = stateResponse.data;

                    if (stateData && stateData.data) {
                        this.log(`${'Balance:'.green} ${stateData.data.balance}`);

                        this.log(`${'Đang đọc thông tin booster...'.yellow}`);
                        const boosterResponse = await this.applyFarmingBooster(fingerprint, fingerprint_2, init_data, 1, proxyIndex);
                        if (boosterResponse.data && boosterResponse.data.status === "OK") {
                            this.log(`${'Nhận booster thành công!'.green}`);
                        } else {
                            this.log(`${'Bạn đã nhận booster rồi!'.yellow}`);
                        }

                        const currentTime = Math.floor(Date.now() / 1000);

                        if (stateData.data.farming && stateData.data.farming.end_at) {
                            const endAt = Math.floor(stateData.data.farming.end_at / 1000);
                            
                            if (currentTime > endAt) {
                                const claimResponse = await this.claimFarming(fingerprint, fingerprint_2, init_data, proxyIndex);
                                if (claimResponse.data && claimResponse.data.status === "OK") {
                                    this.log(`${'Claim farm thành công | balance'.green} ${claimResponse.data.data.balance}`);
                                    
                                    this.log(`${'Bắt đầu farming mới...'.yellow}`);
                                    const newFarmingResponse = await this.startFarming(fingerprint, fingerprint_2, init_data, proxyIndex);
                                    const newFarmingData = newFarmingResponse.data;
                                    
                                    if (newFarmingData && newFarmingData.data) {
                                        const newEndAt = Math.floor(newFarmingData.data.end_at / 1000);
                                        listCountdown.push(newEndAt);
                                        this.log(`${'Thời gian hoàn thành farm mới:'.green} ${new Date(newFarmingData.data.end_at).toLocaleString()}`);
                                    } else {
                                        this.log(`${'Lỗi bắt đầu farming mới!'.red}`);
                                    }
                                } else {
                                    this.log(`${'Lỗi claim farm!'.red}`);
                                }
                            } else {
                                listCountdown.push(endAt);
                                this.log(`${'Thời gian hoàn thành farm:'.green} ${new Date(stateData.data.farming.end_at).toLocaleString()}`);
                            }
                        } else {
                            this.log(`${'Bắt đầu farming...'.yellow}`);
                            const farmingResponse = await this.startFarming(fingerprint, fingerprint_2, init_data, proxyIndex);
                            const farmingData = farmingResponse.data;

                            if (farmingData && farmingData.data) {
                                const endAt = Math.floor(farmingData.data.end_at / 1000);
                                listCountdown.push(endAt);
                                this.log(`${'Thời gian hoàn thành farm:'.green} ${new Date(farmingData.data.end_at).toLocaleString()}`);
                            } else {
                                this.log(`${'Lỗi bắt đầu farming!'.red}`);
                            }
                        }

                        if (stateData.data.config && stateData.data.config.quests) {
                            await this.processQuests(fingerprint, fingerprint_2, init_data, stateData.data.config.quests, stateData.data.executed_quests || {}, proxyIndex);
                        }

                    } else {
                        this.log(`${'Lỗi đọc thông tin người dùng'.red}`);
                    }
                } catch (error) {
                    this.log(`${'Lỗi đọc thông tin người dùng'.red}`);
                    console.log(error);
                }
            }

            const currentTime = Math.floor(Date.now() / 1000);
            const nearestEndTime = Math.min(...listCountdown);
            const waitTime = Math.max(0, nearestEndTime - currentTime);
            await this.countdown(waitTime);
        }
    }
}

if (require.main === module) {
    const clicker = new HexnClicker();
    clicker.main().catch(err => {
        console.error(err);
        process.exit(1);
    });
}