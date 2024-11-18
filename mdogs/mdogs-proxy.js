const fs = require("fs");
const path = require("path");
const axios = require("axios");
const colors = require("colors");
const readline = require("readline");
const { DateTime } = require("luxon");
const { HttpsProxyAgent } = require("https-proxy-agent");

class MDogs {
  constructor() {
    this.headers = {
      Accept: "*",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-Language":
        "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
      "Content-Type": "application/json",
      Origin: "https://app.moneydogs-ton.com",
      Referer: "https://app.moneydogs-ton.com/",
      "Sec-Ch-Ua":
        '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
      "Sec-Ch-Ua-Mobile": "?1",
      "Sec-Ch-Ua-Platform": '"Android"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    };
    this.proxyList = [];
    this.loadProxies();
  }

  loadProxies() {
    try {
      const proxyFile = path.join(__dirname, "proxy.txt");
      this.proxyList = fs
        .readFileSync(proxyFile, "utf8")
        .replace(/\r/g, "")
        .split("\n")
        .filter(Boolean);
    } catch (error) {
      this.log("Không thể đọc file proxy.txt", "error");
      process.exit(1);
    }
  }

  async checkProxyIP(proxy) {
    try {
      const proxyAgent = new HttpsProxyAgent(proxy);
      const response = await axios.get("https://api.ipify.org?format=json", {
        httpsAgent: proxyAgent,
        timeout: 10000,
      });
      if (response.status === 200) {
        return response.data.ip;
      } else {
        throw new Error(
          `Không thể kiểm tra IP của proxy. Status code: ${response.status}`
        );
      }
    } catch (error) {
      throw new Error(`Error khi kiểm tra IP của proxy: ${error.message}`);
    }
  }

  dancayairdrop(proxy) {
    const proxyAgent = new HttpsProxyAgent(proxy);
    return axios.create({
      httpsAgent: proxyAgent,
      timeout: 30000,
      headers: this.headers,
    });
  }

  log(msg, type = "info") {
    const timestamp = new Date().toLocaleTimeString();
    switch (type) {
      case "success":
        console.log(`[${timestamp}] [*] ${msg}`.green);
        break;
      case "custom":
        console.log(`[${timestamp}] [*] ${msg}`.magenta);
        break;
      case "error":
        console.log(`[${timestamp}] [!] ${msg}`.red);
        break;
      case "warning":
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
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    this.log("", "info");
  }

  async checkSession(rawData, axiosInstance) {
    const url = "https://api.moneydogs-ton.com/sessions";
    const payload = {
      encodedMessage: rawData,
      retentionCode: null,
    };

    try {
      const response = await axiosInstance.post(url, payload);

      if (response.status == 200) {
        const { token } = response.data;
        return { success: true, data: { token } };
      }
      return { success: false, error: "Check session failed" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getDailyCheckin(token, axiosInstance) {
    const url = "https://api.moneydogs-ton.com/daily-check-in";
    const headers = {
      ...this.headers,
      "X-Auth-Token": token,
    };

    try {
      const response = await axiosInstance.post(url, {}, { headers });

      if (response.status == 200) {
        this.log("Điểm danh hằng ngày thành công!", "success");
      } else {
        this.log("Bạn đã điểm danh hôm nay rồi!", "warning");
      }
    } catch (error) {
      this.log(`Lỗi điểm danh: ${error.message}`, "error");
    }
  }

  async getTasks(token, axiosInstance) {
    const url = "https://api.moneydogs-ton.com/tasks";
    const headers = {
      ...this.headers,
      "X-Auth-Token": token,
    };

    try {
      const response = await axiosInstance.get(url, { headers });

      if (response.status == 200) {
        return response.data;
      }
    } catch (error) {
      this.log(`Lỗi khi lấy ds nhiệm vụ: ${error.message}`, "error");
      return null;
    }
  }

  async getFeatureTasks(token, axiosInstance) {
    const url = "https://api.moneydogs-ton.com/tasks?isFeatured=true";
    const headers = {
      ...this.headers,
      "X-Auth-Token": token,
    };

    try {
      const response = await axiosInstance.get(url, { headers });

      if (response.status == 200) {
        return response.data;
      }
    } catch (error) {
      this.log(`Không thể lấy ds nhiệm vụ Feature`, "error");
      return null;
    }
  }

  async verifyTask(token, axiosInstance) {
    const tasks = await this.getTasks(token, axiosInstance);
    const feattureTasks = await this.getFeatureTasks(token, axiosInstance);
    let allTasks = [...tasks, ...feattureTasks];  

    allTasks.forEach(async (task) => {
      const id = task.id;
      const title = task.title;
      const url = `https://api.moneydogs-ton.com/tasks/${id}/verify`;
      const headers = {
        ...this.headers,
        "X-Auth-Token": token,
      };

      try {
        const response = await axiosInstance.post(url, {}, { headers });
        if (response.status == 201) {
          this.log(`Hoàn thành nhiệm vụ ${title}`, "success");
        }
      } catch (error) {
        this.log(`Không thể hoàn thành nhiệm vụ ${title} | Cần tự làm`, 'error');
      }
    });
  }

  async main() {
    const dataFile = path.join(__dirname, "data.txt");
    const data = fs
      .readFileSync(dataFile, "utf8")
      .replace(/\r/g, "")
      .split("\n")
      .filter(Boolean);

    while (true) {
      for (let i = 0; i < data.length; i++) {
        const initData = data[i];
        const userData = JSON.parse(
          decodeURIComponent(initData.split("user=")[1].split("&")[0])
        );
        const userName = userData.username;

        let proxyIP = "Unknown";
        let axiosInstance = axios.create({ headers: this.headers });

        if (i < this.proxyList.length) {
          try {
            proxyIP = await this.checkProxyIP(this.proxyList[i]);
            axiosInstance = this.dancayairdrop(this.proxyList[i]);
          } catch (error) {
            this.log(`Lỗi proxy ${i + 1}: ${error.message}`, "error");
            continue;
          }
        }

        console.log(
          `========== Tài khoản ${i + 1} | ${userName.green} | ip: ${
            proxyIP.yellow
          } ==========`
        );

        const sessionResult = await this.checkSession(initData, axiosInstance);
        if (sessionResult.success) {
          this.log("Đăng nhập thành công!", "success");
          const token = sessionResult.data.token;

          await this.getDailyCheckin(token, axiosInstance);
          await this.verifyTask(token, axiosInstance);
        } else {
          this.log(`Đăng nhập thất bại: ${sessionResult.error}`, "error");
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      await this.countdown(60);
    }
  }
}

const client = new MDogs();
client.main().catch((err) => {
  client.log(err.message, "error");
  process.exit(1);
});
