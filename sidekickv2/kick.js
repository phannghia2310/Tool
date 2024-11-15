const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');
const WebSocket = require('ws');

class SidekickAPIClient {
    constructor() {
        this.headers = {
            "Accept": "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
            "Content-Type": "application/json",
            "Origin": "https://game.sidekick.fans",
            "Referer": "https://game.sidekick.fans/",
            "Sec-Ch-Ua": '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-site",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        };
        this.pingInterval = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
    }

    log(msg, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        switch(type) {
            case 'success':
                console.log(`[${timestamp}] [*] ${msg}`.green);
                break;
            case 'custom':
                console.log(`[${timestamp}] [*] ${msg}`);
                break;        
            case 'error':
                console.log(`[${timestamp}] [!] ${msg}`.red);
                break;
            case 'warning':
                console.log(`[${timestamp}] [*] ${msg}`.yellow);
                break;
            case 'outgoing':
                console.log(`[${timestamp}] [→] ${msg}`.cyan);
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

    encodeWebSocketURL(init) {
        const params = init.split('&');
        const processedParams = params.map(param => {
            const [key, value] = param.split('=');
            if (key === 'user') {
                return `user=${encodeURIComponent(value)}`;
            }
            
            return `${key}=${encodeURIComponent(value)}`;
        });
        
        const encodedInit = processedParams.join('%26');
        
        return `wss://gameapi.sidekick.fans/socket.io/?init=${encodedInit}&EIO=4&transport=websocket`;
    }

    setupPingPong(ws, pingInterval) {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }

        this.pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                this.log('Sending ping...', 'outgoing');
                ws.send('2');
            }
        }, pingInterval);

        ws.on('close', () => {
            if (this.pingInterval) {
                clearInterval(this.pingInterval);
                this.pingInterval = null;
            }
        });
    }

    async login(init) {
        const url = "https://gameapi.sidekick.fans/api/user/login";
        const userData = JSON.parse(decodeURIComponent(init.split('user=')[1].split('&')[0]));
        const payload = {
            telegramId: userData.id.toString(),
            firstName: userData.first_name,
            lastName: userData.last_name || "",
            languageCode: userData.language_code,
            isVip: false,
            init: init
        };

        try {
            const response = await axios.post(url, payload, { headers: this.headers });
            if (response.status === 201 && response.data.success) {
                return { 
                    success: true, 
                    token: response.data.data.accessToken
                };
            } else {
                return { success: false, error: response.data.message };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async connectWebSocket(token, init) {
        return new Promise((resolve, reject) => {
            const wsUrl = this.encodeWebSocketURL(init);

            const wsOptions = {
                headers: {
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Accept-Language': 'vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5',
                    'Cache-Control': 'no-cache',
                    'Host': 'gameapi.sidekick.fans',
                    'Origin': 'https://game.sidekick.fans',
                    'Pragma': 'no-cache',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
                    'Sec-Websocket-Extensions': 'permessage-deflate; client_max_window_bits',
                    'Sec-Websocket-Version': '13'
                }
            };

            const ws = new WebSocket(wsUrl, wsOptions);
            
            let hasCalledGetTaskList = false;
            let connectionEstablished = false;
            let taskListReceived = false;
            
            const connectionTimeout = setTimeout(() => {
                if (!connectionEstablished) {
                    this.log('Connection timeout', 'error');
                    ws.close();
                    reject(new Error('Connection timeout'));
                }
            }, 60000);

            const closeWebSocket = () => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close();
                }
                resolve();
            };

            const getTaskList = () => {
                if (!hasCalledGetTaskList) {
                    const taskListMessage = '427["getTaskList"]';
                    ws.send(taskListMessage);
                    hasCalledGetTaskList = true;

                    setTimeout(() => {
                        if (!taskListReceived) {
                            this.log('Task list timeout', 'error');
                            ws.close();
                        }
                    }, 10000);
                }
            };

            ws.on('open', () => {
                this.log('Kết nối thành công', 'success');
                connectionEstablished = true;
                clearTimeout(connectionTimeout);
            });

            ws.on('message', async (data) => {
                const message = data.toString();

                if (message === '2') {
                    ws.send('3');
                    return;
                }

                if (message.startsWith('41')) {
                    this.log(`Chi tiết tin nhắn 41: ${message}`, 'info');
                    return;
                }

                if (message.startsWith('0')) {
                    try {
                        const config = JSON.parse(message.substring(1));
                        if (config.pingInterval) {
                            this.setupPingPong(ws, config.pingInterval);
                        }
                        const authMessage = `40{"token":"Bearer ${token}"}`;
                        ws.send(authMessage);
                    } catch (error) {
                        this.log(`Error parsing config: ${error.message}`, 'error');
                    }
                    return;
                }

                if (message.startsWith('40')) {
                    setTimeout(() => {
                        const signinListMessage = '425["getSigninList"]';
                        ws.send(signinListMessage);
                    }, 5000);
                } else if (message.startsWith('42') || message.startsWith('43')) {
                    try {
                        const jsonStr = message.replace(/^[\d]+/, '').trim();
                        const parsed = JSON.parse(jsonStr);
                        
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            if (parsed[0].list) {
                                const signinList = parsed[0].list;
                                const todaySignin = signinList.find(item => item.isToday === true);
                                
                                if (todaySignin) {
                                    if (todaySignin.isSignin === false) {
                                        const signinMessage = '426["signin"]';
                                        this.log('Gửi yêu cầu signin', 'info');
                                        ws.send(signinMessage);
                                    } else {
                                        this.log('Hôm nay bạn đã điểm danh rồi', 'info');
                                        getTaskList();
                                    }
                                } else {
                                    this.log('Không tìm thấy ngày hôm nay trong danh sách', 'warning');
                                    getTaskList();
                                }
                            } 
                            else if (parsed[0] === true || (Array.isArray(parsed[0]) && parsed[0][0] === true)) {
                                this.log('Thao tác thành công!', 'success');
                                getTaskList();
                            }
                            else if (parsed[0] === "exception") {
                                this.log(`Thao tác không thành công: ${parsed[1].message}`, 'error');
                                getTaskList();
                            }
                            else if (Array.isArray(parsed[0]) || Array.isArray(parsed[1])) {
                                const tasks = Array.isArray(parsed[1]) ? parsed[1] : parsed[0];
                                
                                if (tasks.some(task => task.hasOwnProperty('isFinish'))) {
                                    taskListReceived = true;
                                    const unfinishedTasks = tasks.filter(task => !task.isFinish);
                                    this.log(`Tìm thấy ${unfinishedTasks.length} nhiệm vụ chưa làm`, 'info');
                                
                                    for (const task of unfinishedTasks) {
                                        await new Promise(resolve => setTimeout(resolve, 1000));
                                        const taskId = Math.floor(Math.random() * 1000);
                                        const changeTaskMessage = `42${taskId}["changeTask",{"taskId":"${task._id}"}]`;
                                        ws.send(changeTaskMessage);
                                        this.log(`Làm nhiệm vụ: ${task.title}`, 'info');
                                    }

                                    setTimeout(closeWebSocket, 5000);
                                } else {
                                    this.log('Nhận được danh sách, nhưng không phải danh sách nhiệm vụ', 'info');
                                    closeWebSocket();
                                }
                            }
                        } else {
                            this.log(`Định dạng tin nhắn không hợp lệ: ${JSON.stringify(parsed)}`, 'warning');
                        }
                    } catch (error) {
                        this.log(`Lỗi xử lý tin nhắn: ${error.message}`, 'error');
                        this.log(`Nội dung tin nhắn gốc: ${message}`, 'error');
                    }
                }
            });

            ws.on('close', () => {
                this.log('Ngắt kết nối!', 'info');
                clearTimeout(connectionTimeout);
                if (this.pingInterval) {
                    clearInterval(this.pingInterval);
                    this.pingInterval = null;
                }
                resolve();
            });

            ws.on('error', (error) => {
                this.log(`Lỗi rồi: ${error.message}`, 'error');
                reject(error);
            });
        });
    }

    async main() {
        const dataFile = path.join(__dirname, 'data.txt');
        const data = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);

        while (true) {
            for (let i = 0; i < data.length; i++) {
                const init = data[i];
                const userData = JSON.parse(decodeURIComponent(init.split('user=')[1].split('&')[0]));
                const firstName = userData.first_name;

                console.log(`========== Tài khoản ${i + 1} | ${firstName.green} ==========`);
                
                const loginResult = await this.login(init);
                if (loginResult.success) {
                    this.log('Đăng nhập thành công!', 'success');
                    const token = loginResult.token;

                    this.log('Đọc dữ liệu nhiệm vụ...', 'info');
                    try {
                        await this.connectWebSocket(token, init);
                    } catch (error) {
                        this.log(`Lỗi rồi: ${error.message}`, 'error');
                    }
                } else {
                    this.log(`Đăng nhập không thành công! ${loginResult.error}`, 'error');
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            await this.countdown(1440 * 60);
        }
    }
}

const client = new SidekickAPIClient();
client.main().catch(err => {
    client.log(err.message, 'error');
    process.exit(1);
});