const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');
const { HttpsProxyAgent } = require('https-proxy-agent');

class Rating {
    constructor() {
        this.headers = {
            "Accept": "*/*",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "en-US,en;q=0.9",
            "Content-Type": "text/plain",
            "Origin": "https://static.ratingtma.com",
            "Referer": "https://static.ratingtma.com/",
            "Sec-Ch-Ua": '"Microsoft Edge";v="129", "Not=A?Brand";v="8", "Chromium";v="129", "Microsoft Edge WebView2";v="129"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-site",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0"
        };
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        this.proxyAgent = null;
        this.SPECIAL_TASK_IDS = [];
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
        this.log('', 'info');
    }

    // Hàm kiểm tra proxy và trả về IP của proxy
    async checkProxyIP(proxy) {
        try {
            const proxyAgent = new HttpsProxyAgent(proxy);
            const response = await axios.get('https://api.ipify.org?format=json', { httpsAgent: proxyAgent, timeout: 5000 });
            if (response.status === 200 && response.data && response.data.ip) {
                return response.data.ip;
            } else {
                throw new Error(`Không thể kiểm tra IP của proxy. Status code: ${response.status}`);
            }
        } catch (error) {
            throw new Error(`Error khi kiểm tra IP của proxy: ${error.message}`);
        }
    }

    // Hàm thiết lập proxyAgent
    setProxy(proxy) {
        this.proxyAgent = new HttpsProxyAgent(proxy);
    }

    async authenticate(auth) {
        const url = `https://api.ratingtma.com/auth/auth.tma?${auth}`;
        try {
            const response = await axios.post(url, {}, { headers: this.headers, httpsAgent: this.proxyAgent, timeout: 10000 });
            if (response.status === 200 && response.data.response && response.data.response.token) {
                return { success: true, token: response.data.response.token };
            } else {
                return { success: false, error: 'Invalid response format' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getUserInfo(token) {
        const url = "https://api.ratingtma.com/game/user.get";
        const headers = { 
            ...this.headers, 
            "Authorization": token,
            "Content-Hello": Math.random().toString(),
            "Content-Id": Math.random().toString()
        };
        try {
            const response = await axios.get(url, { headers, httpsAgent: this.proxyAgent, timeout: 10000 });
            if (response.status === 200 && response.data.response) {
                return { success: true, data: response.data.response };
            } else {
                return { success: false, error: 'Invalid response format' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async spinRoulette(token) {
        const url = "https://api.ratingtma.com/game/minigame.roulette";
        const headers = { 
            ...this.headers, 
            "Authorization": token,
            "Content-Hello": Math.random().toString(),
            "Content-Id": Math.random().toString()
        };
        try {
            const response = await axios.post(url, {}, { headers, httpsAgent: this.proxyAgent, timeout: 10000 });
            if (response.status === 200 && response.data.response) {
                return { success: true, data: response.data.response };
            } else {
                return { success: false, error: 'Invalid response format' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getTaskListByGroup(token, group, lang = 'vi') {
        const url = "https://api.ratingtma.com/task/task.list";
        const headers = { 
            ...this.headers, 
            "Authorization": token,
            "Content-Hello": Math.random().toString(),
            "Content-Id": Math.random().toString()
        };
        const payload = { "group": group, "lang": lang };
        try {
            const response = await axios.post(url, payload, { headers, httpsAgent: this.proxyAgent, timeout: 10000 });
            if (response.status === 200 && response.data.response) {
                return { success: true, data: response.data.response };
            } else {
                return { success: false, error: 'Invalid response format' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async executeTaskByOrder(token, group, order) {
        const url = "https://api.ratingtma.com/task/task.execute";
        const headers = { 
            ...this.headers, 
            "Authorization": token,
            "Content-Hello": Math.random().toString(),
            "Content-Id": Math.random().toString()
        };
        const payload = { "group": group, "order": order };
        try {
            const response = await axios.post(url, payload, { headers, httpsAgent: this.proxyAgent, timeout: 10000 });
            if (response.status === 200 && response.data.response) {
                return { success: true, data: response.data.response };
            } else {
                return { success: false, error: 'Invalid response format' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async executeIntegrationTask(token, taskId) {
        const url = "https://api.ratingtma.com/task/task.integration";
        const headers = { 
            ...this.headers, 
            "Authorization": token,
            "Content-Hello": Math.random().toString(),
            "Content-Id": Math.random().toString()
        };
        const payload = { "task": taskId };
        try {
            const response = await axios.post(url, payload, { headers, httpsAgent: this.proxyAgent, timeout: 10000 });
            if (response.status === 200 && response.data.response && response.data.response.result === true) {
                this.log(`Gọi task.integration thành công cho nhiệm vụ ID: ${taskId}`, 'success');
                return true;
            } else {
                this.log(`Gọi task.integration không thành công cho nhiệm vụ ID: ${taskId}: ${JSON.stringify(response.data)}`, 'error');
                return false;
            }
        } catch (error) {
            this.log(`Error integrating task ${taskId}: ${error.message}`, 'error');
            return false;
        }
    }

    // Hàm xử lý nhiệm vụ APP với các nhiệm vụ đặc biệt
    async processAppTask(token, task, group) {
        try {
            this.log(`Bắt đầu xử lý nhiệm vụ APP: ${task.title} (ID: ${task.id})`, 'info');

            const isSpecialTask = this.SPECIAL_TASK_IDS.includes(task.id);

            if (isSpecialTask) {
                // Xử lý nhiệm vụ đặc biệt: chỉ gửi task mà không cần action
                this.log(`Nhiệm vụ đặc biệt: ${task.title} (ID: ${task.id})`, 'info');

                // Gọi API task.task.data với payload chỉ chứa task.id
                const dataResponse = await axios.post('https://api.ratingtma.com/task/task.data', 
                    { task: task.id },
                    { headers: { ...this.headers, Authorization: token }, httpsAgent: this.proxyAgent, timeout: 10000 }
                );

                if (dataResponse.status === 200) {
                    this.log(`Gọi task.data thành công cho nhiệm vụ đặc biệt ${task.title}`, 'success');
                } else {
                    this.log(`Gọi task.data không thành công cho nhiệm vụ đặc biệt ${task.title}: ${JSON.stringify(dataResponse.data)}`, 'error');
                    return;
                }
            } else {
                const appResponse = await axios.post('https://api.ratingtma.com/task/task.app', 
                    { group, task: task.id, action: 'app' },
                    { headers: { ...this.headers, Authorization: token }, httpsAgent: this.proxyAgent, timeout: 10000 }
                );

                if (appResponse.status === 200 && appResponse.data.success) {
                    this.log(`Gọi task.app thành công cho nhiệm vụ ${task.title}`, 'success');
                } else {
                    this.log(`Làm nhiệm vụ không thành công`, 'error');
                    return;
                }

                const dataResponse = await axios.post('https://api.ratingtma.com/task/task.data', 
                    { task: task.id },
                    { headers: { ...this.headers, Authorization: token }, httpsAgent: this.proxyAgent, timeout: 10000 }
                );

                if (dataResponse.status === 200 && dataResponse.data.success) {
                    this.log(`Gọi task.data thành công cho nhiệm vụ ${task.title}`, 'success');
                } else {
                    this.log(`Gọi task.data không thành công: ${JSON.stringify(dataResponse.data)}`, 'error');
                    return;
                }

                // Thêm độ trễ 2 giây để hệ thống cập nhật
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Lấy lại danh sách nhiệm vụ sau khi xử lý
            const response = await this.getTaskListByGroup(token, group);

            if (response.success) {
                const updatedTask = response.data[group].tasks.flat().find(t => t.id === task.id);

                if (updatedTask && updatedTask.order) {
                    this.log(`Thực hiện executeTaskByOrder cho nhiệm vụ ${task.title} với order: ${updatedTask.order}`, 'info');
                    const executeResult = await this.executeTaskByOrder(token, group, updatedTask.order);

                    if (executeResult.success && executeResult.data.result) {
                        const reward = task.item[0]?.count || 'unknown';
                        this.log(`Làm nhiệm vụ APP ${task.title} thành công | phần thưởng ${reward}`, 'success');
                    } else {
                        this.log(`Không thể hoàn thành nhiệm vụ APP ${task.title}`, 'error');
                    }
                } else {
                    this.log(`Nhiệm vụ ${task.title} chưa có order hoặc không tìm thấy nhiệm vụ cập nhật`, 'warning');

                    // Xử lý lỗi bằng cách gọi task.integration với task.id 46
                    const integrationTaskId = 46;
                    const integrationSuccess = await this.executeIntegrationTask(token, integrationTaskId);

                    if (integrationSuccess) {
                        // Sau khi tích hợp, kiểm tra lại order
                        this.log(`Đã gọi task.integration cho nhiệm vụ ID: ${integrationTaskId}. Kiểm tra lại order cho nhiệm vụ ${task.title}`, 'info');

                        // Lấy lại danh sách nhiệm vụ sau khi tích hợp
                        const retryResponse = await this.getTaskListByGroup(token, group);
                        if (retryResponse.success) {
                            const retriedTask = retryResponse.data[group].tasks.flat().find(t => t.id === task.id);

                            if (retriedTask && retriedTask.order) {
                                this.log(`Thực hiện executeTaskByOrder cho nhiệm vụ ${task.title} với order: ${retriedTask.order}`, 'info');
                                const executeResult = await this.executeTaskByOrder(token, group, retriedTask.order);

                                if (executeResult.success && executeResult.data.result) {
                                    const reward = task.item[0]?.count || 'unknown';
                                    this.log(`Làm nhiệm vụ APP ${task.title} thành công | phần thưởng ${reward}`, 'success');
                                } else {
                                    this.log(`Không thể hoàn thành nhiệm vụ APP ${task.title} sau khi tích hợp | Lỗi: ${executeResult.error || 'Không rõ'}`, 'error');
                                }
                            } else {
                                this.log(`Sau khi tích hợp, nhiệm vụ ${task.title} vẫn chưa có order hoặc không tìm thấy nhiệm vụ cập nhật`, 'warning');
                            }
                        } else {
                            this.log(`Không thể lấy lại danh sách nhiệm vụ sau khi tích hợp: ${retryResponse.error}`, 'error');
                        }
                    } else {
                        this.log(`Gọi task.integration không thành công cho nhiệm vụ ID: ${integrationTaskId}`, 'error');
                    }
                }
            } else {
                this.log(`Không thể lấy lại danh sách nhiệm vụ sau khi xử lý: ${response.error}`, 'error');
            }
        } catch (error) {
            this.log(`Error processing APP task ${task.id}: ${error.message}`, 'error');
        }
    }

    async processLinkTask(token, task, group) {
        try {
            await axios.post('https://api.ratingtma.com/task/task.link', 
                { group, task: task.id, action: 'link' },
                { headers: { ...this.headers, Authorization: token }, httpsAgent: this.proxyAgent, timeout: 10000 }
            );

            await axios.post('https://api.ratingtma.com/task/task.data', 
                { task: task.id },
                { headers: { ...this.headers, Authorization: token }, httpsAgent: this.proxyAgent, timeout: 10000 }
            );

            const response = await this.getTaskListByGroup(token, group);

            if (response.success) {
                const updatedTask = response.data[group].tasks.flat().find(t => t.id === task.id);

                if (updatedTask && updatedTask.order) {
                    const executeResult = await this.executeTaskByOrder(token, group, updatedTask.order);

                    if (executeResult.success && executeResult.data.result) {
                        const reward = task.item[0]?.count || 'unknown';
                        this.log(`Làm nhiệm vụ ${task.title} thành công | phần thưởng ${reward}`, 'success');
                    } else {
                        this.log(`Không thể hoàn thành nhiệm vụ ${task.title}`, 'error');
                    }
                }
            }
        } catch (error) {
            this.log(`Error processing task ${task.id}: ${error.message}`, 'error');
        }
    }

    async executeIntegrationTask(token, taskId) {
        try {
            this.log(`Gọi task.integration cho nhiệm vụ ID: ${taskId}`, 'info');

            const integrationResponse = await axios.post('https://api.ratingtma.com/task/task.integration', 
                { task: taskId },
                { headers: { ...this.headers, Authorization: token }, httpsAgent: this.proxyAgent, timeout: 10000 }
            );

            // Kiểm tra response.response.result thay vì response.success
            if (integrationResponse.status === 200 && integrationResponse.data.response && integrationResponse.data.response.result === true) {
                this.log(`Gọi task.integration thành công cho nhiệm vụ ID: ${taskId}`, 'success');
                return true;
            } else {
                this.log(`Gọi task.integration không thành công cho nhiệm vụ ID: ${taskId}: ${JSON.stringify(integrationResponse.data)}`, 'error');
                return false;
            }
        } catch (error) {
            this.log(`Error integrating task ${taskId}: ${error.message}`, 'error');
            return false;
        }
    }

    async processAllTaskLists(token) {
        const groups = ['daily', 'partners', 'monthly', 'main'];
        const lang = 'vi';

        for (const group of groups) {
            try {
                const response = await this.getTaskListByGroup(token, group, lang);
                if (response.success) {
                    const tasks = response.data[group]?.tasks.flat() || [];
                    const openTasks = tasks.filter(task => task.status === 'OPEN');

                    this.log(`Open tasks for ${group}:`, 'info');
                    openTasks.forEach(task => this.log(`- ${task.title} (ID: ${task.id}) [Type: ${task.type}]`, 'custom'));

                    for (const task of openTasks) {
                        if (task.type && task.type.startsWith('app_')) {
                            await this.processAppTask(token, task, group);
                        } else if (task.action === 'link') {
                            await this.processLinkTask(token, task, group);
                        }
                    }
                } else {
                    this.log(`Failed to get tasks for ${group}: ${response.error}`, 'error');
                }
            } catch (error) {
                this.log(`Error processing ${group} tasks: ${error.message}`, 'error');
            }
        }
    }

    async checkMinigameList(token) {
        const url = "https://api.ratingtma.com/game/minigame.list?force_execut=true";
        const headers = { 
            ...this.headers, 
            "Authorization": token,
            "Content-Hello": Math.random().toString(),
            "Content-Id": Math.random().toString()
        };
        try {
            const response = await axios.get(url, { headers, httpsAgent: this.proxyAgent, timeout: 10000 });
            if (response.status === 200 && response.data.response) {
                const comboDay = response.data.response.find(game => game.key === 'combo_day');
                return { success: true, hasLock: comboDay?.lock !== undefined };
            }
            return { success: false, error: 'Invalid response format' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async submitCombo(token, combo) {
        const url = "https://api.ratingtma.com/game/minigame.combo";
        const headers = { 
            ...this.headers, 
            "Authorization": token,
            "Content-Hello": Math.random().toString(),
            "Content-Id": Math.random().toString()
        };
        const changes = combo.split(',').map(item => item.trim());
        try {
            const response = await axios.post(url, { changes }, { headers, httpsAgent: this.proxyAgent, timeout: 10000 });
            if (response.status === 200 && response.data.response) {
                return { success: true, score: response.data.response.score };
            }
            return { success: false, error: 'Invalid response format' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async promptCombo() {
        return new Promise((resolve) => {
            this.rl.question('Nhập mã combo hôm nay (ví dụ strawberry,orange,watermelon) : ', (answer) => {
                resolve(answer.trim());
            });
        });
    }

    async main() {
        const dataFile = path.join(__dirname, 'data.txt');
        const proxyFile = path.join(__dirname, 'proxy.txt');

        // Đọc dữ liệu từ data.txt
        const data = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);

        // Đọc dữ liệu từ proxy.txt
        const proxyData = fs.readFileSync(proxyFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);

        // Kiểm tra số lượng proxy có bằng số lượng tài khoản không
        if (data.length !== proxyData.length) {
            this.log(`Số lượng proxy (${proxyData.length}) không bằng số lượng tài khoản (${data.length})`, 'error');
            process.exit(1);
        }

        const comboInput = await this.promptCombo();
        this.rl.close();

        while (true) {
            for (let i = 0; i < data.length; i++) {
                const auth = data[i];
                const proxy = proxyData[i];
                let userId;

                try {
                    userId = JSON.parse(decodeURIComponent(auth.split('user=')[1].split('&')[0])).id;
                } catch (error) {
                    this.log(`Lỗi khi phân tích user ID từ dòng ${i + 1}: ${error.message}`, 'error');
                    continue;
                }

                // Kiểm tra proxy
                let proxyIP;
                try {
                    proxyIP = await this.checkProxyIP(proxy);
                } catch (error) {
                    this.log(`Proxy cho tài khoản ${i + 1} | ID: ${userId} gặp lỗi: ${error.message}`, 'error');
                    continue; // Bỏ qua tài khoản này và tiếp tục với tài khoản tiếp theo
                }

                // Thiết lập proxy cho lớp Rating
                this.setProxy(proxy);

                // Log thông tin tài khoản và IP của proxy
                this.log(`========== Tài khoản ${i + 1} | ID: ${userId} | IP Proxy: ${proxyIP} ==========`, 'info');

                this.log(`Đang xác thực tài khoản ${userId}...`, 'info');

                const authResult = await this.authenticate(auth);
                if (!authResult.success) {
                    this.log(`Xác thực không thành công! ${authResult.error}`, 'error');
                    continue;
                }

                const token = authResult.token;
                this.log('Xác thực thành công!', 'success');

                if (comboInput) {
                    const minigameListResult = await this.checkMinigameList(token);
                    if (minigameListResult.success && !minigameListResult.hasLock) {
                        const comboResult = await this.submitCombo(token, comboInput);
                        if (comboResult.success) {
                            this.log(`Nhập combo thành công..score: ${comboResult.score}`, 'success');
                        } else {
                            this.log(`Nhập combo thất bại: ${comboResult.error}`, 'error');
                        }
                    } else if (minigameListResult.hasLock) {
                        this.log('Combo Day đã được sử dụng hôm nay', 'warning');
                    }
                }

                const taskListResult = await this.getTaskListByGroup(token, 'calendar');
                if (taskListResult.success) {
                    const readyTask = taskListResult.data.calendar.tasks[0].find(task => task.status === 'READ');
                    if (readyTask) {
                        this.log(`Tìm thấy nhiệm vụ Daily Rewards Calendar sẵn sàng. Order: ${readyTask.order}`, 'info');
                        const executeResult = await this.executeTaskByOrder(token, 'calendar', readyTask.order);
                        if (executeResult.success && executeResult.data.result) {
                            this.log('Daily Rewards Calendar được hoàn thành', 'success');
                        } else {
                            this.log('Không thể hoàn thành Daily Rewards Calendar', 'error');
                        }
                    } else {
                        this.log('Không có nhiệm vụ Daily Rewards Calendar nào sẵn sàng', 'warning');
                    }
                } else {
                    this.log(`Không thể lấy danh sách nhiệm vụ: ${taskListResult.error}`, 'error');
                }

                let userInfoResult = await this.getUserInfo(token);
                if (userInfoResult.success) {
                    let energy = userInfoResult.data.balances.find(b => b.key === 'energy').count;
                    let ticket = userInfoResult.data.balances.find(b => b.key === 'ticket').count;
                    this.log(`Energy: ${energy}, Ticket: ${ticket}`, 'custom');

                    while (ticket > 0) {
                        const spinResult = await this.spinRoulette(token);
                        if (spinResult.success) {
                            this.log(`Spin thành công, nhận được ${spinResult.data.score} score`, 'success');
                            ticket--;
                        } else {
                            this.log(`Spin không thành công: ${spinResult.error}`, 'error');
                            break;
                        }
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }

                    userInfoResult = await this.getUserInfo(token);
                    if (userInfoResult.success) {
                        energy = userInfoResult.data.balances.find(b => b.key === 'energy').count;
                        ticket = userInfoResult.data.balances.find(b => b.key === 'ticket').count;
                        this.log(`Sau khi spin - Energy: ${energy}, Ticket: ${ticket}`, 'custom');
                    }

                    await this.processAllTaskLists(token);
                } else {
                    this.log(`Không thể lấy thông tin người dùng: ${userInfoResult.error}`, 'error');
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            this.log('Đã hoàn thành vòng lặp. Chờ 24 giờ trước khi chạy lại...', 'info');
            await this.countdown(86400); // Chờ 24 giờ
        }
    }
}

const client = new Rating();
client.main().catch(err => {
    client.log(err.message, 'error');
    process.exit(1);
});
