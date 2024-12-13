const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');

class UltraAPIClient {
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
    }

    log(msg, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        switch(type) {
            case 'success':
                console.log(`[${timestamp}] [✓] ${msg}`.green);
                break;
            case 'custom':
                console.log(`[${timestamp}] [*] ${msg}`.magenta);
                break;        
            case 'error':
                console.log(`[${timestamp}] [✗] ${msg}`.red);
                break;
            case 'warning':
                console.log(`[${timestamp}] [!] ${msg}`.yellow);
                break;
            default:
                console.log(`[${timestamp}] [ℹ] ${msg}`.blue);
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

    async fetchUserData(initData) {
        const url = "https://ultra.dawgsai.xyz/get-user-data";
        
        const userDataEncoded = initData.split('user=')[1].split('&')[0];
        const userData = JSON.parse(decodeURIComponent(userDataEncoded));
        
        const payload = {
            user: userData,
            query_id: initData.split('query_id=')[1].split('&')[0],
            auth_date: initData.split('auth_date=')[1].split('&')[0],
            signature: initData.split('signature=')[1].split('&')[0],
            hash: initData.split('hash=')[1]
        };

        try {
            const response = await axios.post(url, payload, { headers: this.headers });
            
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

    async claimEarlyAdopterBonus(userData) {
        const url = "https://ultra.dawgsai.xyz/update-early-adopter";
        const payload = {
            pointsNo: 10000,
            user: userData
        };

        try {
            const response = await axios.post(url, payload, { headers: this.headers });

            if (response.status === 200 && response.data.message === "Points updated successfully") {
                this.log(`Bonus cập nhật thành công cho người dùng ${userData.username}`, 'success');
                console.log(`PointsNo: ${response.data.userData.pointsNo}, UserLevel: ${response.data.userData.userLevel}`);
                return true;
            }
        } catch (error) {
            this.log(`Lỗi khi cập nhật bonus: ${error.message}`, 'error');
        }
        return false;
    }

    async checkDailyRewardStatus(userData) {
        const url = "https://ultra.dawgsai.xyz/daily-reward-status";
        const payload = {
            user: userData
        };

        try {
            const response = await axios.post(url, payload, { headers: this.headers });
            if (response.status === 200) {
                const { reward } = response.data;

                if (reward.__v === 0) {
                    this.log("Chưa điểm danh hôm nay, thực hiện điểm danh...", 'custom');
                    await this.claimDailyReward(userData);
                } else if (reward.__v > 1) {
                    const lastClaimDate = new Date(reward.dailyClaims[reward.dailyClaims.length - 1].date);
                    const currentDate = new Date();

                    if (currentDate.getDate() !== lastClaimDate.getDate()) {
                        this.log("Ngày hôm nay đã qua 1 ngày, thực hiện điểm danh lại...", 'custom');
                        await this.claimDailyReward(userData);
                    } else {
                        this.log("Hôm nay bạn đã điểm danh rồi.", 'warning');
                    }
                }
            }
        } catch (error) {
            this.log(`Lỗi khi kiểm tra trạng thái điểm danh: ${error.message}`, 'error');
        }
    }

    async claimDailyReward(userData) {
        const url = "https://ultra.dawgsai.xyz/daily-reward-claim";
        const payload = {
            user: userData
        };

        try {
            const response = await axios.post(url, payload, { headers: this.headers });

            if (response.status === 200 && response.data.message === "Points claimed successfully") {
                this.log(`Checkin hàng ngày thành công | Nhận ${response.data.totalPoints} points`, 'success');
                return true;
            }
        } catch (error) {
            this.log(`Lỗi khi thực hiện điểm danh: ${error.message}`, 'error');
        }
        return false;
    }

    async performSocialTasks(userData) {
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
            const updateTasksOneUrl = "https://ultra.dawgsai.xyz/update-user-tasks-one";
            const updateTasksFourUrl = "https://ultra.dawgsai.xyz/update-user-tasks-four";
    
            const oneResponse = await retryApiCall(async () => 
                await axios.post(updateTasksOneUrl, { user: userData }, { headers: this.headers })
            );
    
            const fourResponse = await retryApiCall(async () => 
                await axios.post(updateTasksFourUrl, { user: userData }, { headers: this.headers })
            );
    
            const socialRewardDeets = oneResponse.data.userData.socialRewardDeets || 
                                       fourResponse.data.userData.socialRewardDeets;
    
            const activeSocialTasks = socialRewardDeets.filter(
                task => task.taskStatus === "active" && !task.rewardClaimed
            );
    
            for (const task of activeSocialTasks) {
                const updateTaskPointsUrl = "https://ultra.dawgsai.xyz/update-task-points";
                await retryApiCall(async () => 
                    await axios.post(updateTaskPointsUrl, {
                        pointsNo: task.taskPoints || 1000,
                        user: userData
                    }, { headers: this.headers })
                );
    
                const updateSocialRewardUrl = "https://ultra.dawgsai.xyz/update-social-reward";
                await retryApiCall(async () => 
                    await axios.post(
                        updateSocialRewardUrl, 
                        {
                            claimTreshold: task.claimTreshold,
                            user: userData
                        }, 
                        { headers: this.headers }
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

    async main() {
        const dataFile = path.join(__dirname, 'data.txt');
        const data = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);

        while (true) {
            for (let i = 0; i < data.length; i++) {
                const initData = data[i];
                const userDataa = JSON.parse(decodeURIComponent(initData.split('user=')[1].split('&')[0]));

                console.log(`========== Tài khoản ${i + 1} | ${userDataa.username.green} ==========`);

                const userDataResult = await this.fetchUserData(initData);
                const userData = userDataResult.data.userData || {};
                const pointsNo = userData.pointsNo !== undefined ? userData.pointsNo : 'Chưa có điểm';
                const userLevel = userData.userLevel !== undefined ? userData.userLevel : 'Chưa có cấp độ';
                if (userDataResult.success) {
                    if (!userDataResult.data.userData.earlyAdopterBonusClaimed) {
                        await this.claimEarlyAdopterBonus(userDataResult.data.userData.user);
                    } else {
                        this.log(`User ${userData.user.username} đã nhận bonus`, 'success');
                        this.log(`PointsNo: ${pointsNo}`, 'custom');
                        this.log(`UserLevel: ${userLevel}`, 'custom');
                    }

                    await this.checkDailyRewardStatus(userDataResult.data.userData.user);
                } else {
                    this.log(`Không thể lấy dữ liệu người dùng: ${userDataResult.error}`, 'error');
                }

                await this.performSocialTasks(userData.user);

                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            await this.countdown(1440 * 60);
        }
    }
}

const client = new UltraAPIClient();
client.main().catch(err => {
    client.log(err.message, 'error');
    process.exit(1);
});
