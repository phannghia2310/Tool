const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

class warlockAPIClient {
    constructor() {
        this.headers = {
            "Accept": "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
            "Content-Type": "application/json",
            "Origin": "https://shalom.aidawgs.xyz",
            "Referer": "https://shalom.aidawgs.xyz/",
            "Sec-Ch-Ua": '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "cross-site",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        };
        this.accountIndex = 0;
        this.proxyIP = null;
    }

    log(msg, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const accountPrefix = `[Tài khoản ${this.accountIndex + 1}]`;
        const ipPrefix = this.proxyIP ? `[${this.proxyIP}]` : '[Unknown IP]';
        let logMessage = '';
        
        switch(type) {
            case 'success':
                logMessage = `${timestamp} ${accountPrefix}${ipPrefix} ${msg}`.green;
                break;
            case 'custom':
                logMessage = `${timestamp} ${accountPrefix}${ipPrefix} ${msg}`.magenta;
                break;
            case 'error':
                logMessage = `${timestamp} ${accountPrefix}${ipPrefix} ${msg}`.red;
                break;
            case 'warning':
                logMessage = `${timestamp} ${accountPrefix}${ipPrefix} ${msg}`.yellow;
                break;
            default:
                logMessage = `${timestamp} ${accountPrefix}${ipPrefix} ${msg}`.blue;
        }
        
        console.log(logMessage);
    }

    async generateToken(userData) {
        const url = "https://warlock.dawgsai.xyz/generate-token";
        
        try {
            const payload = { user: userData };
            
            const response = await axios.post(url, payload, { 
                headers: this.headers
            });
            
            if (response.status === 200 && response.data.success) {
                this.token = response.data.token;
                this.headers['Authorization'] = `Bearer ${this.token}`;
                
                this.log(`Token được tạo thành công cho người dùng ${userData.username}`, 'success');
                return {
                    success: true,
                    token: this.token,
                    expiresIn: response.data.expiresIn
                };
            } else {
                this.log('Không thể lấy token', 'error');
                return { 
                    success: false, 
                    error: 'Failed to generate token' 
                };
            }
        } catch (error) {
            this.log(`Lỗi khi đọc token: ${error.message}`, 'error');
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    async checkProxyIP(proxy) {
        try {
            const proxyAgent = new HttpsProxyAgent(proxy);
            const response = await axios.get('https://api.ipify.org?format=json', { 
                httpsAgent: proxyAgent,
                proxy: false
            });
            
            if (response.status === 200) {
                this.proxyIP = response.data.ip;
                return this.proxyIP;
            } else {
                throw new Error(`Không thể kiểm tra IP của proxy. Status code: ${response.status}`);
            }
        } catch (error) {
            this.log(`Lỗi khi kiểm tra IP của proxy: ${error.message}`, 'error');
            return null;
        }
    }

    async countdown(seconds) {
        for (let i = seconds; i > 0; i--) {
            const timestamp = new Date().toLocaleTimeString();
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`[${timestamp}] [*] Chờ ${i} giây để tiếp tục...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        readline.cursorTo(process.stdout, 0);
        readline.clearLine(process.stdout, 0);
    }

    async fetchUserData(initData, proxy) {
        const url = "https://warlock.dawgsai.xyz/get-user-data";
        
        try {
            const userDataEncoded = initData.split('user=')[1].split('&')[0];
            const userData = JSON.parse(decodeURIComponent(userDataEncoded));
            
            const payload = {
                user: userData,
                query_id: initData.split('query_id=')[1].split('&')[0],
                auth_date: initData.split('auth_date=')[1].split('&')[0],
                signature: initData.split('signature=')[1].split('&')[0],
                hash: initData.split('hash=')[1]
            };

            const proxyAgent = new HttpsProxyAgent(proxy);
            const response = await axios.post(url, payload, { 
                headers: this.headers,
                httpsAgent: proxyAgent,
                proxy: false
            });
            
            if (response.status === 200) {
                this.log(`Lấy dữ liệu người dùng ${userData.username} thành công!`, 'success');
                return { 
                    success: true, 
                    data: response.data 
                };
            } else {
                this.log(`Không thể lấy dữ liệu người dùng: ${response.statusText}`, 'error');
                return { 
                    success: false, 
                    error: response.statusText 
                };
            }
        } catch (error) {
            this.log(`Lỗi khi gọi API: ${error.message}`, 'error');
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    async claimEarlyAdopterBonus(userData, proxy) {
        const url = "https://warlock.dawgsai.xyz/update-early-adopter";
        const payload = {
            pointsNo: 10000,
            user: userData
        };

        try {
            const proxyAgent = new HttpsProxyAgent(proxy);
            const response = await axios.post(url, payload, { 
                headers: this.headers,
                httpsAgent: proxyAgent,
                proxy: false
            });

            if (response.status === 200 && response.data.message === "Points updated successfully") {
                this.log(`Bonus cập nhật thành công cho người dùng ${userData.username} | Points: ${response.data.userData.pointsNo} | UserLevel: ${response.data.userData.userLevel}`, 'success');
                return true;
            }
        } catch (error) {
            this.log(`Lỗi khi cập nhật bonus: ${error.message}`, 'error');
        }
        return false;
    }

    async checkDailyRewardStatus(userData, proxy) {
        const url = "https://warlock.dawgsai.xyz/daily-reward-status";
        const payload = {
            user: userData
        };
    
        try {
            const proxyAgent = new HttpsProxyAgent(proxy);
            const response = await axios.post(url, payload, { 
                headers: this.headers,
                httpsAgent: proxyAgent,
                proxy: false
            });
    
            if (response.status === 200) {
                const { reward } = response.data;
    
                if (!reward) {
                    this.log("Không tìm thấy thông tin phần thưởng", 'warning');
                    return;
                }
    
                if (reward.__v === 0) {
                    this.log("Chưa điểm danh hôm nay, thực hiện điểm danh...", 'custom');
                    await this.claimDailyReward(userData, proxy);
                    return;
                }
    
                if (!reward.dailyClaims || !Array.isArray(reward.dailyClaims) || reward.dailyClaims.length === 0) {
                    this.log("Không có thông tin điểm danh trước đó", 'custom');
                    await this.claimDailyReward(userData, proxy);
                    return;
                }
    
                const lastClaim = reward.dailyClaims[reward.dailyClaims.length - 1];
                
                if (!lastClaim || !lastClaim.date) {
                    this.log("Thông tin ngày điểm danh không hợp lệ", 'warning');
                    await this.claimDailyReward(userData, proxy);
                    return;
                }
    
                const lastClaimDate = new Date(lastClaim.date);
                const currentDate = new Date();
    
                if (currentDate.getDate() !== lastClaimDate.getDate() || 
                    currentDate.getMonth() !== lastClaimDate.getMonth() || 
                    currentDate.getFullYear() !== lastClaimDate.getFullYear()) {
                    this.log("Ngày hôm nay đã qua 1 ngày, thực hiện điểm danh lại...", 'custom');
                    await this.claimDailyReward(userData, proxy);
                } else {
                    this.log("Hôm nay bạn đã điểm danh rồi.", 'warning');
                }
            }
        } catch (error) {
            this.log(`Lỗi khi kiểm tra trạng thái điểm danh: ${error.message}`, 'error');
            
            try {
                await this.claimDailyReward(userData, proxy);
            } catch (claimError) {
                this.log(`Lỗi khi cố gắng điểm danh: ${claimError.message}`, 'error');
            }
        }
    }

    async claimDailyReward(userData, proxy) {
        const url = "https://warlock.dawgsai.xyz/daily-reward-claim";
        const payload = {
            user: userData
        };

        try {
            const proxyAgent = new HttpsProxyAgent(proxy);
            const response = await axios.post(url, payload, { 
                headers: this.headers,
                httpsAgent: proxyAgent,
                proxy: false
            });

            if (response.status === 200 && response.data.message === "Points claimed successfully") {
                this.log(`Checkin hàng ngày thành công | Nhận ${response.data.totalPoints} points`, 'success');
                return true;
            }
        } catch (error) {
            this.log(`Lỗi khi thực hiện điểm danh: ${error.message}`, 'error');
        }
        return false;
    }

    async performSocialTasks(userData, proxy) {
        const MAX_RETRIES = 10;
        const RETRY_DELAY = 3000; 
    
        const retryApiCall = async (apiCall) => {
            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    return await apiCall();
                } catch (error) {
                    if (error.response && (error.response.status === 504 || error.response.status === 502)) {
                        this.log(`Attempt ${attempt}: 504 Gateway Timeout. Retrying in 3 seconds...`, 'warning');
                        
                        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                        
                        if (attempt === MAX_RETRIES) {
                            this.log('Max retries reached. Unable to complete the API call.', 'error');
                            throw error;
                        }
                    } else {
                        throw error;
                    }
                }
            }
        };
    
        try {
            const proxyAgent = new HttpsProxyAgent(proxy);
    
            const updateTasksOneUrl = "https://warlock.dawgsai.xyz/update-user-tasks-one";
            const updateTasksFourUrl = "https://warlock.dawgsai.xyz/update-user-tasks-four";
    
            const oneResponse = await retryApiCall(async () => 
                await axios.post(updateTasksOneUrl, { user: userData }, { 
                    headers: this.headers,
                    httpsAgent: proxyAgent,
                    proxy: false
                })
            );
    
            const fourResponse = await retryApiCall(async () => 
                await axios.post(updateTasksFourUrl, { user: userData }, { 
                    headers: this.headers,
                    httpsAgent: proxyAgent,
                    proxy: false
                })
            );
    
            const socialRewardDeets = oneResponse.data.userData.socialRewardDeets || 
                                       fourResponse.data.userData.socialRewardDeets;
    
            const activeSocialTasks = socialRewardDeets.filter(
                task => task.taskStatus === "active" && !task.rewardClaimed
            );
    
            for (const task of activeSocialTasks) {
                const updateTaskPointsUrl = "https://warlock.dawgsai.xyz/update-task-points";
                await retryApiCall(async () => 
                    await axios.post(updateTaskPointsUrl, {
                        pointsNo: task.taskPoints || 1000,
                        user: userData
                    }, { 
                        headers: this.headers,
                        httpsAgent: proxyAgent,
                        proxy: false
                    })
                );
    
                const updateSocialRewardUrl = "https://warlock.dawgsai.xyz/update-social-reward";
                await retryApiCall(async () => 
                    await axios.post(
                        updateSocialRewardUrl, 
                        {
                            claimTreshold: task.claimTreshold,
                            user: userData
                        }, 
                        { 
                            headers: this.headers,
                            httpsAgent: proxyAgent,
                            proxy: false
                        }
                    )
                );
    
                this.log(`Task "${task.taskText}" completed successfully | Reward: ${task.taskPoints} points`, 'success');
            }
    
            return {
                activeTasks: activeSocialTasks,
                message: "Social tasks processed successfully"
            };
    
        } catch (error) {
            this.log(`Critical error in social tasks: ${error.message}`, 'error');
            throw error;
        }
    }

    async processAccount(initData, proxy) {
        try {
            this.proxyIP = await this.checkProxyIP(proxy);
            const userData = JSON.parse(decodeURIComponent(initData.split('user=')[1].split('&')[0]));
            this.accountIndex = userData.username;

            const tokenResult = await this.generateToken(userData);
            if (!tokenResult.success) {
                return false;
            }

            const userDataResult = await this.fetchUserData(initData, proxy);
            
            if (userDataResult.success) {
                const userData = userDataResult.data.userData || {};

                if (!userDataResult.data.userData.earlyAdopterBonusClaimed) {
                    await this.claimEarlyAdopterBonus(userDataResult.data.userData.user, proxy);
                } else {
                    this.log(`PointsNo: ${userData.pointsNo || 'Chưa có điểm'} | UserLevel: ${userData.userLevel || 'Chưa có cấp độ'}`, 'custom');
                }

                await this.checkDailyRewardStatus(userDataResult.data.userData.user, proxy);
                
                try {
                    await this.performSocialTasks(userData.user, proxy);
                } catch (error) {
                    this.log(`Lỗi khi thực hiện social tasks: ${error.message}`, 'error');
                }

                return true;
            } else {
                this.log(`Không thể lấy dữ liệu người dùng: ${userDataResult.error}`, 'error');
                return false;
            }
        } catch (error) {
            this.log(`Lỗi xử lý tài khoản: ${error.message}`, 'error');
            return false;
        }
    }

    async main() {
        const dataFile = path.join(__dirname, 'data.txt');
        const proxyFile = path.join(__dirname, 'proxy.txt');
        
        const data = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);
        
        const proxies = fs.readFileSync(proxyFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);

        const maxThreads = 10;
        const threadTimeout = 10 * 60 * 1000;

        while (true) {
            for (let i = 0; i < data.length; i += maxThreads) {
                const batchAccounts = data.slice(i, i + maxThreads);
                const batchProxies = proxies.slice(i, i + maxThreads);

                const threadPromises = batchAccounts.map((initData, index) => {
                    return new Promise((resolve, reject) => {
                        const worker = new Worker(__filename, {
                            workerData: { 
                                initData, 
                                proxy: batchProxies[index] 
                            }
                        });

                        const timeoutId = setTimeout(() => {
                            worker.terminate();
                            reject(new Error('Timeout: Worker đã bị dừng'));
                        }, threadTimeout);

                        worker.on('message', (result) => {
                            clearTimeout(timeoutId);
                            resolve(result);
                        });

                        worker.on('error', (error) => {
                            clearTimeout(timeoutId);
                            reject(error);
                        });
                    });
                });

                await Promise.allSettled(threadPromises);

                if (i + maxThreads < data.length) {
                    this.log('Chờ 3 giây trước khi xử lý batch tiếp theo...', 'custom');
                    await this.countdown(3);
                }
            }

            this.log('Đã xử lý xong tất cả các tài khoản. Chờ 24 giờ trước lần chạy tiếp theo...', 'custom');
            await this.countdown(86400);
        }
    }
}

if (!isMainThread) {
    const client = new warlockAPIClient();
    const { initData, proxy } = workerData;

    client.processAccount(initData, proxy)
        .then(result => {
            parentPort.postMessage(result);
        })
        .catch(error => {
            parentPort.postMessage({ error: error.message });
        });
}

if (isMainThread) {
    const client = new warlockAPIClient();
    client.main().catch(err => {
        console.error('Lỗi chính:', err);
        process.exit(1);
    });
}

module.exports = warlockAPIClient;