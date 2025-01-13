const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');
const { DateTime } = require('luxon');

class Pitchtalk {
    constructor() {
        this.baseHeaders = {
            "Accept": "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "en-US,en;q=0.9",
            "Content-Type": "application/json",
            "Origin": "https://webapp.pitchtalk.app",
            "Referer": "https://webapp.pitchtalk.app/",
            "Sec-Ch-Ua": '"Microsoft Edge";v="129", "Not=A?Brand";v="8", "Chromium";v="129", "Microsoft Edge WebView2";v="129"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-site",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0"
        };
        this.skippedTaskIds = [
            'aec632eb-7104-4652-938b-bc8d61f83c77',
            'c51fbe56-b913-470d-9bac-6cacc9e4864f'
        ];
    }

    log(msg, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        switch(type) {
            case 'success':
                console.log(`[${timestamp}] [*] ${msg}`.green);
                break;
            case 'custom':
                console.log(`[${timestamp}] [*] ${msg}`.magenta);
                break;        
            case 'error':
                console.log(`[${timestamp}] [!] ${msg}`.red);
                break;
            case 'warning':
                console.log(`[${timestamp}] [*] ${msg}`.yellow);
                break;
            default:
                console.log(`[${timestamp}] [*] ${msg}`.blue);
        }
    }

    async countdown(seconds) {
        for (let i = seconds; i >= 0; i--) {
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`===== Chờ ${i} giây để tiếp tục vòng lặp =====`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('');
    }

    getHeaders(hash, token = null) {
        const headers = {
            ...this.baseHeaders,
            "X-Telegram-Hash": hash
        };
        
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        
        return headers;
    }

    async auth(hash) {
        const url = "https://api.pitchtalk.app/v1/api/auth";
        const telegramId = hash.match(/id%22%3A(\d+)/)[1];
        const username = hash.match(/username%22%3A%22([^%]+)/)[1];
        
        const payload = {
            telegramId,
            username,
            hash,
            referralCode: "",
            photoUrl: ""
        };

        try {
            const response = await axios.post(url, payload, { headers: this.getHeaders(hash) });
            if (response) {
                const { coins, tickets, loginStreak, farmingId } = response.data.user;
                return { accessToken: response.data.accessToken, username, coins, tickets, loginStreak, farmingId };
            } else {
                throw new Error(`Auth failed with status ${response.status}`);
            }
        } catch (error) {
            this.log(`Auth error: ${error.message}`, 'error');
            return null;
        }
    }

    async createFarming(token, hash) {
        const url = "https://api.pitchtalk.app/v1/api/users/create-farming";
        
        try {
            const response = await axios.get(url, { headers: this.getHeaders(hash, token) });
            if (response) {
                const { farmingId, farming } = response.data;
                const endTime = DateTime.fromISO(farming.endTime);
                this.log(`Đang farm với id: ${farmingId}`, 'success');
                this.log(`Thời gian hoàn thành: ${endTime.toLocaleString(DateTime.DATETIME_FULL)}`, 'info');
                return farming;
            } else {
                throw new Error(`Failed to create farming with status ${response.status}`);
            }
        } catch (error) {
            this.log(`Error creating farming: ${error.message}`, 'error');
            return null;
        }
    }

    async getFarming(token, hash) {
        const url = "https://api.pitchtalk.app/v1/api/farmings";
        
        try {
            const response = await axios.get(url, { headers: this.getHeaders(hash, token) });
            if (response.status === 200) {
                const farming = response.data;
                const now = DateTime.now();
                const endTime = DateTime.fromISO(farming.endTime);
                
                if (now < endTime) {
                    this.log(`Đang farm với id: ${farming.id}`, 'success');
                    this.log(`Thời gian hoàn thành: ${endTime.toLocaleString(DateTime.DATETIME_FULL)}`, 'info');
                } else {
                    this.log(`Farm với id ${farming.id} đã hoàn thành`, 'success');
                    await this.claimFarming(token, hash);
                }
                return farming;
            } else {
                throw new Error(`Failed to get farming with status ${response.status}`);
            }
        } catch (error) {
            this.log(`Error getting farming: ${error.message}`, 'error');
            return null;
        }
    }

    async claimFarming(token, hash) {
        const url = "https://api.pitchtalk.app/v1/api/users/claim-farming";
        
        try {
            const response = await axios.get(url, null, { headers: this.getHeaders(hash, token) });
            if (response) {
                this.log('Claim farming success!', 'success');
                return response.data;
            } else {
                throw new Error(`Failed to claim farming with status ${response.status}`);
            }
        } catch (error) {
            this.log(`Error claiming farming: ${error.message}`, 'error');
            return null;
        }
    }

    async getTasks(token, hash) {
        const url = "https://api.pitchtalk.app/v1/api/tasks";
        
        try {
            const response = await axios.get(url, { headers: this.getHeaders(hash, token) });
            if (response.status === 200) {
                return response.data;
            } else {
                throw new Error(`Failed to get tasks with status ${response.status}`);
            }
        } catch (error) {
            this.log(`Error getting tasks: ${error.message}`, 'error');
            return null;
        }
    }

    async startTask(token, hash, taskId) {
        const url = `https://api.pitchtalk.app/v1/api/tasks/${taskId}/start`;
        
        try {
            const response = await axios.post(url, {}, { headers: this.getHeaders(hash, token) });
            if (response) {
                return response.data;
            } else {
                throw new Error(`Failed to start task with status ${response.status}`);
            }
        } catch (error) {
            this.log(`Error starting task: ${error.message}`, 'error');
            return null;
        }
    }

    async verifyTasks(token, hash) {
        const url = "https://api.pitchtalk.app/v1/api/tasks/verify";
        
        try {
            const response = await axios.get(url, { headers: this.getHeaders(hash, token) });
            if (response.status === 200) {
                return response.data;
            } else {
                throw new Error(`Failed to verify tasks with status ${response.status}`);
            }
        } catch (error) {
            this.log(`Error verifying tasks: ${error.message}`, 'error');
            return null;
        }
    }

    async main() {
        const dataFile = path.join(__dirname, 'data.txt');
        const data = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);
        while (true) {
            for (let i = 0; i < data.length; i++) {
                const hash = data[i];
                const authResult = await this.auth(hash);
                
                if (authResult) {
                    const { accessToken, username, coins, tickets, loginStreak, farmingId } = authResult;
                    this.log(`========== Tài khoản ${i + 1} | ${username} ==========`, 'custom');
                    this.log(`Coins: ${coins}, Tickets: ${tickets}, Login Streak: ${loginStreak}`, 'info');
                    
                    if (farmingId === null) {
                        await this.createFarming(accessToken, hash);
                    } else {
                        await this.getFarming(accessToken, hash);
                    }
                }
            }
            await this.countdown(21600);
        }
    }
}

const client = new Pitchtalk();
client.main().catch(err => {
    client.log(err.message, 'error');
    process.exit(1);
});